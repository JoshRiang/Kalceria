import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RATE_PER_HOUR = 120000;
const WA_ADMIN = process.env.WA_ADMIN_NUMBER || '6281234567890';

// ─── Time helpers ─────────────────────────────────────────────────────────────
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function calcHours(start, end) {
  const s = timeToMinutes(start);
  let e = timeToMinutes(end);
  if (e === 0) e = 24 * 60; // midnight = end of day
  return (e - s) / 60;
}

function buildWaUrl(booking, user) {
  const dateStr = new Date(booking.bookingDate).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const msg = [
    `WEH ADA PESANAN MASUK! 🔥`,
    ``,
    `Layanan: SHOOTING`,
    `Pemesan: ${user.name} (${user.email})`,
    `Tanggal: ${dateStr}`,
    `Waktu: ${booking.startTime} - ${booking.endTime}`,
    `Total Tagihan: Rp ${booking.totalAmount.toLocaleString('id-ID')}`,
    ``,
    `Mohon segera konfirmasi!`,
  ].join('\n');
  return `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;
}

// ─── POST /services/book (Need Us? Timekeeper) ────────────────────────────────
export async function createBooking(req, res, next) {
  try {
    const userId = req.user.userId;
    const { serviceType = 'SHOOTING', bookingDate, startTime, endTime } = req.body;

    // ── Anti-tamper Timekeeper ────────────────────────────────────────────────
    const serverNow = new Date();
    const target = new Date(bookingDate);
    const maxDate = new Date(serverNow);
    maxDate.setDate(maxDate.getDate() + 7);

    if (target < serverNow || target > maxDate) {
      return res.status(400).json({ error: 'bookingDate must be today to +7 days.' });
    }

    // ── Time Validation ───────────────────────────────────────────────────────
    if (timeToMinutes(startTime) < timeToMinutes('09:00')) {
      return res.status(400).json({ error: 'startTime must be >= 09:00.' });
    }
    if (endTime !== '00:00' && timeToMinutes(endTime) > timeToMinutes('23:59')) {
      return res.status(400).json({ error: 'endTime must be <= 23:59.' });
    }
    if (endTime !== '00:00' && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return res.status(400).json({ error: 'endTime must be after startTime.' });
    }

    // ── Cost Calculation ──────────────────────────────────────────────────────
    const hours = calcHours(startTime, endTime);
    const totalAmount = hours * RATE_PER_HOUR;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const booking = await prisma.booking.create({
      data: { userId, serviceType, bookingDate: target, startTime, endTime, totalAmount },
    });

    const whatsappUrl = buildWaUrl(booking, user);

    res.status(201).json({ bookingId: booking.id, totalAmount, whatsappUrl });
  } catch (err) {
    next(err);
  }
}
