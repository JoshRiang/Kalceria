import prisma from '../lib/prisma.js';

import { redis } from '../lib/redis.js';


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
    const { serviceType = 'SHOOTING', bookingDate, startTime, endTime } = req.body || {};

    if (!['EO', 'SHOOTING', 'HOST_EVENT'].includes(serviceType)) {
      return res.status(400).json({ error: 'Invalid serviceType.' });
    }
    if (typeof bookingDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !Number.isFinite(new Date(bookingDate).getTime())) {
      return res.status(400).json({ error: 'bookingDate must be a valid date.' });
    }
    const validTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (!validTime(startTime) || !(validTime(endTime) || endTime === '00:00')) {
      return res.status(400).json({ error: 'startTime and endTime must use HH:mm format.' });
    }

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
      // Invalidate public bookings cache
      await redis.del('cache:public_bookings');
    }
  } catch (err) {
    next(err);
  }
}

// ─── POST /services/request (EO / Car Shoot — ServiceBooking) ─────────────────
export async function createServiceRequest(req, res, next) {
  try {
    const userId = req.user.userId;
    const body = req.body || {};
    const { serviceType, serviceName, contactPerson, whatsapp, location, additionalNotes, slots } = body;

    if (!Array.isArray(slots) || slots.length < 1 || slots.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 slots allowed per booking request.' });
    }

    if (!['EO', 'SHOOTING', 'HOST_EVENT'].includes(serviceType)) {
      return res.status(400).json({ error: 'Invalid serviceType.' });
    }

    const validTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
    const validSlots = slots.every((slot) => {
      if (!slot || typeof slot.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(slot.date) || !Number.isFinite(new Date(slot.date).getTime())) return false;
      if (!validTime(slot.startTime) || !(validTime(slot.endTime) || slot.endTime === '00:00')) return false;
      if (slot.startTime === '00:00' && slot.endTime === '01:00') return true;
      if (timeToMinutes(slot.startTime) < 9 * 60) return false;
      return timeToMinutes(slot.endTime) > timeToMinutes(slot.startTime) || slot.endTime === '00:00';
    });
    if (!validSlots) return res.status(400).json({ error: 'Please provide valid booking dates and times.' });

    const maxTextLengths = { serviceName: 160, contactPerson: 120, whatsapp: 32, location: 500, additionalNotes: 5000 };
    for (const [field, max] of Object.entries(maxTextLengths)) {
      const value = body[field];
      if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > max)) {
        return res.status(400).json({ error: `${field} must be ${max} characters or less.` });
      }
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
        locationString: location || 'TBD',
        additionalNotes: additionalNotes || null,
        slots: {
          create: (slots || []).map(s => ({
            date: new Date(s.date),
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        }
      },
      include: { slots: true }
    });

    // Invalidate public bookings cache
    await redis.del('cache:public_bookings');

    const firstSlot = slots && slots.length > 0 ? slots[0] : null;
    const dateStr = firstSlot ? new Date(firstSlot.date).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }) : 'Multiple Dates';

    const msg = [
      `📋 SERVICE REQUEST BARU`,
      ``,
      `Layanan: ${serviceType}`,
      `Nama: ${serviceName || '—'}`,
      `PIC: ${contactPerson || user.name}`,
      `WA: ${whatsapp || '—'}`,
      `Lokasi: ${location || '—'}`,
      `Jadwal: ${slots?.length || 0} slot dipilih`,
      `Tanggal Mulai: ${dateStr}`,
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

// ─── GET /services/bookings (Public for Heatmap) ───────────────────────────
export async function listPublicServiceBookings(req, res, next) {
  try {
    const cacheKey = 'cache:public_bookings';
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const slots = await prisma.serviceBookingSlot.findMany({
      include: {
        serviceBooking: {
          select: { status: true }
        }
      },
      where: {
        serviceBooking: {
          status: { in: ['PENDING', 'PROCESSED'] }
        }
      }
    });

    const formatted = slots.map(s => ({
      id: s.serviceBookingId,
      targetDate: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.serviceBooking.status
    }));

    const response = { bookings: formatted };
    
    // Cache for 30 seconds (short for "real-time" feel but saves DB hits)
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 30);

    res.json(response);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /services/request/:id (User cancels their own) ───────────────────
export async function deleteOwnServiceRequest(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const booking = await prisma.serviceBooking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: 'Request not found.' });

    if (booking.requestorId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this request.' });
    }

    await prisma.serviceBooking.delete({ where: { id } });
    res.json({ message: 'Request deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
