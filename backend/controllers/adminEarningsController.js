import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getEarnings(req, res, next) {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = end ? new Date(end) : new Date();

    // 1. Get confirmed ServiceBookings (NeedUs form)
    const services = await prisma.serviceBooking.findMany({
      where: {
        paymentStatus: 'CONFIRMED',
        createdAt: { gte: startDate, lte: endDate }
      },
      include: { slots: true }
    });

    // 2. Get confirmed EventRegistrations
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        paymentStatus: 'CONFIRMED',
        createdAt: { gte: startDate, lte: endDate }
      },
      include: { event: true }
    });

    // 3. Get confirmed Bookings (Timekeeper)
    const bookings = await prisma.booking.findMany({
      where: {
        paymentStatus: 'CONFIRMED',
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    const dailyEarnings = {};

    // Process ServiceBookings (75k / hour)
    services.forEach(b => {
      const day = b.createdAt.toISOString().split('T')[0];
      let totalHours = 0;
      b.slots.forEach(s => {
        const startH = parseInt(s.startTime.split(':')[0]);
        const endH = parseInt(s.endTime.split(':')[0]);
        // handle cross-midnight if any
        let diff = endH - startH;
        if (diff < 0) diff += 24;
        totalHours += diff;
      });
      const amount = totalHours * 75000;
      dailyEarnings[day] = (dailyEarnings[day] || 0) + amount;
    });

    // Process Event Registrations
    registrations.forEach(r => {
      const day = r.createdAt.toISOString().split('T')[0];
      dailyEarnings[day] = (dailyEarnings[day] || 0) + (r.event.price || 0);
    });

    // Process Timekeeper Bookings
    bookings.forEach(b => {
      const day = b.createdAt.toISOString().split('T')[0];
      dailyEarnings[day] = (dailyEarnings[day] || 0) + (b.totalAmount || 0);
    });

    // Convert to sorted array
    const sortedDays = Object.keys(dailyEarnings).sort().map(day => ({
      date: day,
      amount: dailyEarnings[day] / 1000000 // Convert to Juta
    }));

    // Historical average (overall total / days)
    const totalEarnings = sortedDays.reduce((acc, curr) => acc + curr.amount, 0);
    const avg = sortedDays.length > 0 ? totalEarnings / sortedDays.length : 0;

    res.json({
      daily: sortedDays,
      total: totalEarnings,
      average: avg
    });
  } catch (err) {
    next(err);
  }
}
