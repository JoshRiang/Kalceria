import prisma from '../lib/prisma.js';

// ─── GET /admin/earnings ─────────────────────────────────────────────────────
// Returns real revenue data aggregated from 3 sources:
//   1. ServiceBooking (Phase 3 totalPrice field, status PROCESSED)
//   2. EventRegistration (event.price, paymentStatus CONFIRMED)
//   3. Merch.totalRevenue (cumulative sales tracked in Phase 3 Piece 6A)
//   4. Booking/Timekeeper (totalAmount, paymentStatus CONFIRMED)
// Grouped by month for chart, and summed for the KPI total.
export async function getEarnings(req, res, next) {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), 0, 1);
    let endDate = new Date();
    if (end) {
      endDate = new Date(end);
      endDate.setUTCHours(23, 59, 59, 999);
    }

    // ── Source 1: Processed ServiceBookings (Phase 3 accepted bookings) ──────
    const services = await prisma.serviceBooking.findMany({
      where: {
        status: 'PROCESSED',
        totalPrice: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, createdAt: true, totalPrice: true, serviceName: true, requestor: { select: { name: true } } },
    });

    // ── Source 2: Confirmed Event Registrations ───────────────────────────────
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        paymentStatus: 'CONFIRMED',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, createdAt: true, event: { select: { title: true, price: true } }, user: { select: { name: true } } },
    });

    // ── Source 3: Confirmed Timekeeper Bookings ───────────────────────────────
    const bookings = await prisma.booking.findMany({
      where: {
        paymentStatus: 'CONFIRMED',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, createdAt: true, totalAmount: true, serviceType: true, user: { select: { name: true } } },
    });

    // ── Source 5: Merch Sales Log ─────────────────────────────────────────────
    const merchSales = await prisma.merchSale.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { merch: { select: { name: true } } },
    });

    // ── Source 4: Merch cumulative revenue (all time, not date-gated) ────────
    const merchAgg = await prisma.merch.aggregate({
      _sum: { totalRevenue: true },
    });
    const totalMerchRevenue = merchAgg._sum.totalRevenue || 0;

    // ── Group by month (YYYY-MM) ──────────────────────────────────────────────
    const monthlyEarnings = {};

    const addToMonth = (date, amount) => {
      if (amount == null) return;
      const key = date.toISOString().slice(0, 7); // "YYYY-MM"
      monthlyEarnings[key] = (monthlyEarnings[key] || 0) + amount;
    };

    services.forEach(b => addToMonth(b.createdAt, b.totalPrice || 0));
    registrations.forEach(r => addToMonth(r.createdAt, r.event?.price || 0));
    bookings.forEach(b => addToMonth(b.createdAt, b.totalAmount || 0));

    // Distribute merch revenue evenly across all months in the date window
    // to keep the chart meaningful (not spike on a single point)
    const monthCount = Object.keys(monthlyEarnings).length || 1;
    const merchPerMonth = totalMerchRevenue / monthCount;
    Object.keys(monthlyEarnings).forEach(key => {
      monthlyEarnings[key] = (monthlyEarnings[key] || 0) + merchPerMonth;
    });

    // ── Build sorted daily array for chart (in Juta IDR) ─────────────────────
    const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const sortedMonths = Object.keys(monthlyEarnings).sort();
    const daily = sortedMonths.map(key => {
      const [, monthStr] = key.split('-');
      return {
        date: key,
        label: MONTH_LABELS[parseInt(monthStr, 10) - 1],
        amount: monthlyEarnings[key] / 1_000_000, // convert to Juta
      };
    });

    // ── KPI totals (raw IDR) ─────────────────────────────────────────────────
    const totalFromServices = services.reduce((s, b) => s + (b.totalPrice || 0), 0);
    const totalFromRegs = registrations.reduce((s, r) => s + (r.event?.price || 0), 0);
    const totalFromBookings = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const grandTotal = totalFromServices + totalFromRegs + totalFromBookings + totalMerchRevenue;

    const avg = daily.length > 0
      ? daily.reduce((s, d) => s + d.amount, 0) / daily.length
      : 0;

    // ── Build Granular Transactions Log ──────────────────────────────────────
    const transactions = [
      ...services.map(s => ({
        id: s.id,
        date: s.createdAt,
        who: s.requestor?.name || 'Unknown',
        source: 'Service Booking',
        item: s.serviceName || 'Service',
        qty: 1,
        price: s.totalPrice,
        total: s.totalPrice,
      })),
      ...registrations.map(r => ({
        id: r.id,
        date: r.createdAt,
        who: r.user?.name || 'Unknown',
        source: 'Event Registration',
        item: r.event?.title || 'Event',
        qty: 1,
        price: r.event?.price || 0,
        total: r.event?.price || 0,
      })),
      ...bookings.map(b => ({
        id: b.id,
        date: b.createdAt,
        who: b.user?.name || 'Unknown',
        source: 'Timekeeper',
        item: b.serviceType || 'Booking',
        qty: 1,
        price: b.totalAmount,
        total: b.totalAmount,
      })),
      ...merchSales.map(m => ({
        id: m.id,
        date: m.createdAt,
        who: m.recordedBy || 'Admin',
        source: 'Merch Sale',
        item: m.merch?.name || 'Product',
        qty: m.qty,
        price: m.pricePerUnit,
        total: m.totalAmount,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)); // descending

    res.json({
      daily,
      total: grandTotal / 1_000_000,    // total in Juta (for chart compatibility)
      totalRaw: grandTotal,             // total in raw IDR (for KPI card display)
      average: avg,
      breakdown: {
        serviceBookings: totalFromServices,
        eventRegistrations: totalFromRegs,
        timekeeperBookings: totalFromBookings,
        merch: totalMerchRevenue,
      },
      transactions,
    });
  } catch (err) {
    next(err);
  }
}
