import { PrismaClient } from '@prisma/client';

import { redis } from '../lib/redis.js';

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

    // ── Race Condition Protection (Redis Lock) ──────────────────────────────
    const lockKey = `lock:booking:${bookingDate}:${startTime}:${endTime}`;
    const acquired = await redis.set(lockKey, userId, 'EX', 10, 'NX'); 
    if (!acquired) {
      return res.status(423).json({ error: 'This slot is currently being processed by another user. Try again in 10 seconds.' });
    }

    try {
      // ── Check DB for Overlaps ──────────────────────────────────────────────
      const existing = await prisma.booking.findFirst({
        where: {
          bookingDate: target,
          status: 'CONFIRMED',
          OR: [
            { startTime: { lte: startTime }, endTime: { gt: startTime } },
            { startTime: { lt: endTime }, endTime: { gte: endTime } },
            { startTime: { gte: startTime }, endTime: { lte: endTime } }
          ]
        }
      });

      if (existing) {
        return res.status(409).json({ error: 'Slot already booked and confirmed.' });
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
    } finally {
      // Release lock immediately after DB write
      await redis.del(lockKey);
    }
  } catch (err) {
    next(err);
  }
}

// ─── POST /services/request (EO / Car Shoot — ServiceBooking) ─────────────────
export async function createServiceRequest(req, res, next) {
  try {
    const userId = req.user.userId;
    const { serviceType, serviceName, contactPerson, whatsapp, location, targetDate, additionalNotes } = req.body;

    if (!['EO', 'SHOOTING', 'HOST_EVENT'].includes(serviceType)) {
      return res.status(400).json({ error: 'Invalid serviceType.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const booking = await prisma.serviceBooking.create({
      data: {
        requestorId: userId,
        serviceType,
        serviceName: serviceName || null,
        contactPerson: contactPerson || user.name,
        whatsapp: whatsapp || null,
        location: location || null,
        targetDate: new Date(targetDate),
        locationString: location || 'TBD',
        additionalNotes: additionalNotes || null,
      },
    });

    const dateStr = new Date(targetDate).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const msg = [
      `📋 SERVICE REQUEST BARU`,
      ``,
      `Layanan: ${serviceType}`,
      `Nama: ${serviceName || '—'}`,
      `PIC: ${contactPerson || user.name}`,
      `WA: ${whatsapp || '—'}`,
      `Lokasi: ${location || '—'}`,
      `Tanggal: ${dateStr}`,
      `Catatan: ${additionalNotes || '—'}`,
      ``,
      `Dari: ${user.name} (${user.email})`,
    ].join('\n');

    const whatsappUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;
    res.status(201).json({ bookingId: booking.id, whatsappUrl });
  } catch (err) {
    next(err);
  }
}
