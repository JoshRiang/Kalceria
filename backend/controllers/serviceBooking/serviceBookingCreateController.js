import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { safeNotify, sendServiceRequestSubmittedEmail, sendServiceRequestAdminAlertEmail } from '../../lib/mailer.js';
import { notifyServiceRequestCreated } from '../../lib/whatsappBroker.js';
import { isLocationFromVerifiedList } from '../geoController.js';
import { setServiceBookingCooldown } from '../../middleware/ingressDefense.js';
import { CANONICAL_USER_SELECT } from '../../utils/profileDefaults.js';
import { buildServiceRequestWaMessage } from '../comms/waMessageBuilder.js';
import { RATE_PER_HOUR, WA_ADMIN, timeToMinutes, calcHours, buildWaUrl } from './serviceBookingConstants.js';
import { resolveServiceRequestor } from './serviceRequestorResolver.js';

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

// ─── POST /services/request (Need Our Help Multipart & Public Candidate Buffer) ───────────────
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
    const REPEATING_DIGITS_REGEX = /(\d)\1{6,}/;

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
      include: { slots: true, requestor: true }
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
      booking: { ...booking, email: targetEmail, requestor: booking.requestor || user },
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

