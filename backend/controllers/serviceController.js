import argon2 from 'argon2';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { safeNotify, sendServiceRequestSubmittedEmail, sendServiceRequestUpdatedEmail, sendServiceRequestAdminAlertEmail } from '../lib/mailer.js';
import { notifyServiceRequestCreated } from '../lib/whatsappBroker.js';
import { isValidIndonesianLocation, isLocationFromVerifiedList } from './geoController.js';
import { setServiceBookingCooldown, clearServiceBookingCooldown } from '../middleware/ingressDefense.js';
import { CANONICAL_USER_SELECT } from '../utils/profileDefaults.js';

const RATE_PER_HOUR = 120000;
const WA_ADMIN = process.env.WA_ADMIN_NUMBER || '628117998790';

let serviceGuestPlaceholderHash;
const getServiceGuestHash = () => (
  serviceGuestPlaceholderHash ??= argon2.hash(`svc-guest-${crypto.randomBytes(24).toString('hex')}`)
);

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

export function buildServiceRequestWaMessage(booking, slots = [], contactPerson, whatsapp, location, additionalNotes, senderLabel, isUpdate = false) {
  const serviceLabelMap = {
    SHOOTING: 'Shooting / Production',
    EO: 'Event Organizer',
    HOST_EVENT: 'Host Event',
  };
  const serviceLabel = serviceLabelMap[booking.serviceType] || booking.serviceType;

  const formattedDates = [...new Set((slots || []).map((s) => {
    const d = new Date(s.date);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }))].join(', ');

  const formattedHours = (slots || []).map((s) => `${s.startTime} - ${s.endTime}`).join(', ');

  const header = isUpdate ? 'UPDATE PESANAN - NEED OUR HELP' : 'SERVICE REQUEST - NEED OUR HELP';

  const lines = [
    header,
    ``,
    `Booking ID: #${booking.id ? booking.id.slice(-6) : 'NEW'}`,
    `Service: ${serviceLabel}`,
    `Request Title: ${booking.serviceName || '—'}`,
    `Operator Name: ${contactPerson || booking.contactPerson || '—'}`,
    `WhatsApp: ${whatsapp || booking.whatsapp || '—'}`,
    `Deployment Area: ${location || booking.location || '—'}`,
    `Selected Date: ${formattedDates || '—'}`,
    `Selected Hours: ${formattedHours || '—'}`,
  ];

  const notes = additionalNotes !== undefined ? additionalNotes : booking.additionalNotes;
  if (notes && String(notes).trim()) {
    const trimmed = String(notes).trim();
    lines.push(`Notes: ${trimmed.length > 50 ? trimmed.slice(0, 50) + '...' : trimmed}`);
  }
  if (senderLabel) {
    lines.push(``);
    lines.push(`Dari: ${senderLabel}`);
  }

  return lines.join('\n');
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
        select: CANONICAL_USER_SELECT,
      });

      const booking = await prisma.booking.create({
        data: { userId, serviceType, bookingDate: target, startTime, endTime, totalAmount },
      });

      const whatsappUrl = buildWaUrl(booking, user);

      await setServiceBookingCooldown(req, userId);
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

async function resolveServiceRequestor(req, contactPerson, whatsapp, email) {
  if (req.user?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: CANONICAL_USER_SELECT,
    });
    if (user) return user;
  }

  const cleanContact = typeof contactPerson === 'string' ? contactPerson.trim() : '';
  const cleanWa = typeof whatsapp === 'string' ? whatsapp.trim() : '';
  if (!cleanContact || cleanWa.length < 5) {
    return null;
  }

  const cleanEmail = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? email.trim().toLowerCase()
    : null;

  const digits = cleanWa.replace(/\D/g, '').slice(0, 20) || crypto.randomBytes(6).toString('hex');
  const guestEmail = cleanEmail || `guest-svc-${digits}@guest.kalceria.local`;

  const existing = await prisma.user.findUnique({
    where: { email: guestEmail },
    select: { id: true, name: true, email: true },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      name: cleanContact,
      dob: new Date('2000-01-01'),
      email: guestEmail,
      gender: 'OTHER',
      phone: cleanWa,
      passwordHash: await getServiceGuestHash(),
      domicileLat: 0,
      domicileLng: 0,
      isEmailVerified: Boolean(cleanEmail),
    },
    select: { id: true, name: true, email: true },
  });
}

// ─── POST /services/request (EO / Car Shoot — ServiceBooking) ─────────────────
export async function createServiceRequest(req, res, next) {
  try {
    const body = req.body || {};
    const { serviceType, serviceName, contactPerson, whatsapp, location, additionalNotes, slots } = body;

    if (!req.user?.userId && (!contactPerson || !whatsapp)) {
      return res.status(401).json({ error: 'Please sign in or provide contact details.' });
    }

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

    // 1. Strict Indonesian WhatsApp regex validation (+628xxxxxxxxxx)
    const cleanWa = typeof whatsapp === 'string' ? whatsapp.trim().replace(/[\s-]/g, '') : '';
    const phoneDigits = cleanWa.replace(/^\+?62/, '').replace(/^0+/, '').replace(/\D/g, '');
    const ID_MOBILE_REGEX = /^8(?:1[1-9]|2[1-3]|3[1238]|5[1-35-9]|7[78]|8[1-9]|9[5-9])\d{6,10}$/;
    const REPEATING_DIGITS_REGEX = /(\d){6,}/;

    if (!cleanWa.startsWith('+62') || !ID_MOBILE_REGEX.test(phoneDigits) || REPEATING_DIGITS_REGEX.test(phoneDigits)) {
      return res.status(400).json({
        error: 'Please provide a valid Indonesian WhatsApp contact (+62 8xx-xxxx-xxxx).',
      });
    }

    // 2. Strict Indonesian Deployment Area location validation
    const cleanLocation = typeof location === 'string' ? location.trim() : '';
    const selectionToken = body.selectionToken;
    const lat = body.lat;
    const lon = body.lon ?? body.lng;
    const isLocValid = await isLocationFromVerifiedList(cleanLocation, selectionToken, lat, lon);
    if (!isLocValid) {
      return res.status(400).json({
        error: 'Please provide a valid Indonesian deployment area (Street, City, Province).',
      });
    }

    // 3. Strict Email validation (public & authenticated submissions)
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;
    const effectiveEmail = rawEmail || (req.user?.userId ? req.user.email : '');
    if (!effectiveEmail || !EMAIL_REGEX.test(effectiveEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid email address (e.g. name@domain.com).',
      });
    }

    const user = await resolveServiceRequestor(req, contactPerson, cleanWa, effectiveEmail);
    if (!user) {
      return res.status(400).json({ error: 'Please provide operator name and WhatsApp contact.' });
    }

    const booking = await prisma.serviceBooking.create({
      data: {
        requestorId: user.id,
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

    // Invalidate public bookings cache & enforce 24-hour rate limit cooldown
    await redis.del('cache:public_bookings');
    await setServiceBookingCooldown(req, user.id);

    const targetEmail = effectiveEmail || user.email;
    const senderLabel = targetEmail.endsWith('@guest.kalceria.local')
      ? `${contactPerson || user.name} (Guest)`
      : `${user.name || contactPerson} (${targetEmail})`;

    const msg = buildServiceRequestWaMessage(
      booking,
      slots,
      contactPerson,
      whatsapp,
      location,
      additionalNotes,
      senderLabel
    );

    const whatsappUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;
    const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
    const cancelToken = jwt.sign(
      { bookingId: booking.id, requestorId: user.id, action: 'manage' },
      cancelSecret,
      { algorithm: 'HS256', audience: 'kalceria-service-cancel', issuer: 'kalceria-api', expiresIn: '3m' },
    );

    // Dispatches (fire-and-forget, safe & isolated)
    safeNotify(() => notifyServiceRequestCreated({
      booking,
      slots,
      user,
      contactPerson,
      whatsapp,
    }), 'whatsapp-service-request');

    safeNotify(() => sendServiceRequestSubmittedEmail({
      to: targetEmail,
      booking,
      slots,
      cancelToken,
    }), 'email-service-request');

    safeNotify(() => sendServiceRequestAdminAlertEmail({
      booking,
      slots,
      user,
    }), 'email-service-admin-alert');

    res.status(201).json({ bookingId: booking.id, whatsappUrl, cancelToken, userEmail: targetEmail });
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

const THREE_MINUTES_MS = 3 * 60 * 1000;

function verifyServiceBookingAuthorization(booking, req) {
  const userId = req.user?.userId || null;
  const tokenHeader = req.get('x-manage-token') || req.get('x-cancel-token') || req.query?.token || '';

  let validTokenBookingId = null;
  if (tokenHeader) {
    const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
    try {
      const decoded = jwt.verify(tokenHeader, cancelSecret, {
        algorithms: ['HS256'],
        issuer: 'kalceria-api',
      });
      validTokenBookingId = decoded?.bookingId || null;
    } catch {}
  }

  const authorizedByUser = Boolean(userId && booking.requestorId === userId);
  const authorizedByToken = Boolean(validTokenBookingId && validTokenBookingId === booking.id);
  const isRecentGuest = Boolean(
    booking.requestor?.email?.endsWith('@guest.kalceria.local') &&
    Date.now() - new Date(booking.createdAt).getTime() <= THREE_MINUTES_MS
  );

  return authorizedByUser || authorizedByToken || isRecentGuest;
}

// ─── GET /services/request/:id (Inspect for 3-minute edit) ───────────────────
export async function getServiceRequestForEdit(req, res, next) {
  try {
    const { id } = req.params;
    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: { slots: true, requestor: true },
    });
    if (!booking) return res.status(404).json({ error: 'Request not found.' });

    if (!verifyServiceBookingAuthorization(booking, req)) {
      return res.status(403).json({ error: 'Unauthorized to access this request.' });
    }

    const elapsed = Date.now() - new Date(booking.createdAt).getTime();
    if (elapsed > THREE_MINUTES_MS) {
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk mengedit pesanan telah berakhir. Hubungi kami via WhatsApp.',
        isExpired: true,
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((THREE_MINUTES_MS - elapsed) / 1000));
    res.json({
      booking: {
        id: booking.id,
        serviceType: booking.serviceType,
        serviceName: booking.serviceName,
        contactPerson: booking.contactPerson,
        whatsapp: booking.whatsapp,
        email: booking.requestor?.email || "",
        location: booking.location,
        additionalNotes: booking.additionalNotes,
        slots: (booking.slots || []).map((s) => ({
          date: s.date.toISOString().split('T')[0],
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        createdAt: booking.createdAt,
      },
      remainingSeconds,
    });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /services/request/:id (Update within 15 minutes) ─────────────────────
export async function updateServiceRequest(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const { serviceType, serviceName, contactPerson, whatsapp, location, additionalNotes, slots } = body;

    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: { slots: true, requestor: true },
    });
    if (!booking) return res.status(404).json({ error: 'Request not found.' });

    if (!verifyServiceBookingAuthorization(booking, req)) {
      return res.status(403).json({ error: 'Unauthorized to modify this request.' });
    }

    const originalCreatedAt = booking.createdAt;
    const elapsed = Date.now() - new Date(originalCreatedAt).getTime();
    if (elapsed > THREE_MINUTES_MS) {
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk mengedit pesanan telah berakhir. Hubungi kami via WhatsApp.',
        isExpired: true,
      });
    }

    const remainingSeconds = Math.max(1, Math.floor((THREE_MINUTES_MS - elapsed) / 1000));

    if (!Array.isArray(slots) || slots.length < 1 || slots.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 slots allowed per booking request.' });
    }

    const cleanServiceType = serviceType || booking.serviceType;
    if (!['EO', 'SHOOTING', 'HOST_EVENT'].includes(cleanServiceType)) {
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

    // Strict Indonesian WhatsApp validation if updating whatsapp
    const cleanWa = typeof whatsapp === 'string' ? whatsapp.trim().replace(/[\s-]/g, '') : booking.whatsapp;
    const phoneDigits = cleanWa.replace(/^\+?62/, '').replace(/^0+/, '').replace(/\D/g, '');
    const ID_MOBILE_REGEX = /^8(?:1[1-9]|2[1-3]|3[1238]|5[1-35-9]|7[78]|8[1-9]|9[5-9])\d{6,10}$/;
    if (!cleanWa.startsWith('+62') || !ID_MOBILE_REGEX.test(phoneDigits)) {
      return res.status(400).json({
        error: 'Please provide a valid Indonesian WhatsApp contact (+62 8xx-xxxx-xxxx).',
      });
    }

    // Strict email validation if updating email
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;
    if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid email address (e.g. name@domain.com).',
      });
    }

    const cleanLocation = typeof location === 'string' ? location.trim() : booking.location;
    const cleanNotes = additionalNotes !== undefined ? (typeof additionalNotes === 'string' ? additionalNotes.trim() : null) : booking.additionalNotes;

    const updatedBooking = await prisma.$transaction(async (tx) => {
      // 1. Delete old booking entry (which cascades slot deletion)
      await tx.serviceBooking.delete({
        where: { id: booking.id },
      });

      // 2. Create the updated booking entry preserving user & operational invariants (original createdAt preserved so countdown counter is not reset!)
      return tx.serviceBooking.create({
        data: {
          requestorId: booking.requestorId,
          createdAt: originalCreatedAt,
          serviceType: cleanServiceType,
          serviceName: serviceName || booking.serviceName,
          contactPerson: contactPerson || booking.contactPerson,
          whatsapp: cleanWa,
          location: cleanLocation,
          locationString: cleanLocation,
          additionalNotes: cleanNotes,
          status: 'PENDING',
          paymentStatus: booking.paymentStatus || 'PENDING',
          slots: {
            create: slots.map((s) => ({
              date: new Date(s.date),
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          },
        },
        include: { slots: true, requestor: true },
      });
    });

    try {
      await redis.del('cache:public_bookings');
    } catch {}
    try {
      await setServiceBookingCooldown(req, booking.requestorId);
    } catch {}

    const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
    const cancelToken = jwt.sign(
      { bookingId: updatedBooking.id },
      cancelSecret,
      { expiresIn: remainingSeconds, issuer: 'kalceria-api' }
    );

    const targetEmail = rawEmail || booking.requestor?.email;
    const senderLabel = targetEmail?.endsWith('@guest.kalceria.local')
      ? `${contactPerson || booking.contactPerson} (Guest)`
      : `${booking.requestor?.name || contactPerson || booking.contactPerson} (${targetEmail || ''})`;

    const msg = buildServiceRequestWaMessage(
      updatedBooking,
      slots,
      contactPerson || booking.contactPerson,
      cleanWa,
      cleanLocation,
      cleanNotes,
      senderLabel,
      true // isUpdate
    );
    const whatsappUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;

    safeNotify(() => sendServiceRequestUpdatedEmail({
      to: targetEmail,
      booking: updatedBooking,
      slots,
      cancelToken,
    }), 'email-service-request-update');

    res.json({
      success: true,
      bookingId: updatedBooking.id,
      booking: updatedBooking,
      cancelToken,
      whatsappUrl,
      userEmail: targetEmail,
      remainingSeconds,
    });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /services/request/:id (User or immediate guest cancel within 15 mins) ────────────
export async function deleteOwnServiceRequest(req, res, next) {
  try {
    const { id } = req.params;

    const booking = await prisma.serviceBooking.findUnique({ 
      where: { id },
      include: { requestor: true }
    });
    if (!booking) return res.status(404).json({ error: 'Request not found.' });

    if (!verifyServiceBookingAuthorization(booking, req)) {
      return res.status(403).json({ error: 'Unauthorized to delete this request.' });
    }

    const elapsed = Date.now() - new Date(booking.createdAt).getTime();
    if (elapsed > THREE_MINUTES_MS) {
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk membatalkan pesanan telah berakhir. Hubungi kami via WhatsApp.',
        isExpired: true,
      });
    }

    await prisma.serviceBooking.delete({ where: { id } });
    await redis.del('cache:public_bookings');
    await clearServiceBookingCooldown(req, booking.requestorId);
    res.json({ message: 'Request deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
