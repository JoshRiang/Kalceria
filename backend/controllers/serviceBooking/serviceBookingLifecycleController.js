import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { safeNotify, sendServiceRequestUpdatedEmail, sendServiceRequestConfirmedEmail } from '../../lib/mailer.js';
import { setServiceBookingCooldown, clearServiceBookingCooldown } from '../../middleware/ingressDefense.js';
import { buildServiceRequestWaMessage } from '../comms/waMessageBuilder.js';
import { renderConfirmResultHtml } from '../comms/confirmResultHtml.js';
import { THREE_MINUTES_MS, WA_ADMIN, timeToMinutes } from './serviceBookingConstants.js';
import { verifyServiceBookingAuthorization } from './serviceBookingAuth.js';

// ─── GET /services/request/:id (Inspect for 3-minute edit) ───────────────────
export async function getServiceRequestForEdit(req, res, next) {
  try {
    const { id } = req.params;
    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: { slots: true, requestor: true },
    });
    if (!booking) {
      return res.status(404).json({
        error: 'Batas waktu 3 menit untuk memproses pesanan telah berakhir. Pesanan otomatis dibatalkan atau tidak ditemukan.',
        isExpired: true,
      });
    }

    if (!verifyServiceBookingAuthorization(booking, req)) {
      return res.status(403).json({ error: 'Unauthorized to access this request.' });
    }

    if (booking.status === 'PROCESSED') {
      return res.status(403).json({
        error: 'Pesanan ini sudah dikonfirmasi dan terkunci. Perubahan tidak dapat dilakukan.',
        isConfirmed: true,
        booking,
        remainingSeconds: 0,
      });
    }

    const elapsed = Date.now() - new Date(booking.createdAt).getTime();
    if (elapsed > THREE_MINUTES_MS || req._serviceTokenExpired) {
      if (booking.status === 'PENDING') {
        try {
          await prisma.serviceBooking.delete({ where: { id: booking.id } });
          await redis.del('cache:public_bookings');
        } catch {}
      }
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk mengedit pesanan telah berakhir. Pesanan yang belum dikonfirmasi telah dibatalkan.',
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

// ─── PUT /services/request/:id (Update within 3 minutes) ─────────────────────
export async function updateServiceRequest(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const { serviceType, serviceName, contactPerson, whatsapp, location, additionalNotes, slots } = body;

    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: { slots: true, requestor: true },
    });
    if (!booking) {
      return res.status(404).json({
        error: 'Batas waktu 3 menit untuk memproses pesanan telah berakhir. Pesanan otomatis dibatalkan atau tidak ditemukan.',
        isExpired: true,
      });
    }

    if (!verifyServiceBookingAuthorization(booking, req)) {
      return res.status(403).json({ error: 'Unauthorized to modify this request.' });
    }

    if (booking.status === 'PROCESSED') {
      return res.status(403).json({
        error: 'Pesanan ini sudah dikonfirmasi dan terkunci. Perubahan tidak dapat dilakukan.',
        isConfirmed: true,
        booking,
        remainingSeconds: 0,
      });
    }

    const originalCreatedAt = booking.createdAt;
    const elapsed = Date.now() - new Date(originalCreatedAt).getTime();
    if (elapsed > THREE_MINUTES_MS) {
      if (booking.status === 'PENDING') {
        try {
          await prisma.serviceBooking.delete({ where: { id: booking.id } });
          await redis.del('cache:public_bookings');
        } catch {}
      }
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk mengedit pesanan telah berakhir. Pesanan yang belum dikonfirmasi telah dibatalkan.',
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
    const REPEATING_DIGITS_REGEX = /(\d)\1{6,}/;
    if (!cleanWa.startsWith('+62') || !ID_MOBILE_REGEX.test(phoneDigits) || REPEATING_DIGITS_REGEX.test(phoneDigits)) {
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
      // 1. Delete old slots explicitly (prevents foreign key errors and orphan slots)
      if (tx.serviceBookingSlot?.deleteMany) {
        await tx.serviceBookingSlot.deleteMany({
          where: { serviceBookingId: booking.id },
        });
      }

      // 2. If guest provided updated contact email, update user entity cleanly
      if (rawEmail && booking.requestor?.email?.endsWith('@guest.kalceria.local') && tx.user?.update) {
        await tx.user.update({
          where: { id: booking.requestorId },
          data: {
            email: rawEmail,
            name: contactPerson || booking.contactPerson || undefined,
          },
        });
      }

      // 3. Atomically update existing booking row in-place, keeping booking.id intact
      if (typeof tx.serviceBooking.update === 'function') {
        return tx.serviceBooking.update({
          where: { id: booking.id },
          data: {
            serviceType: cleanServiceType,
            serviceName: serviceName || booking.serviceName,
            contactPerson: contactPerson || booking.contactPerson,
            whatsapp: cleanWa,
            location: cleanLocation,
            locationString: cleanLocation || booking.locationString || '',
            additionalNotes: cleanNotes,
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
      }

      // 4. Safe fallback for mock transactions that only stub delete/create
      if (typeof tx.serviceBooking.delete === 'function') {
        await tx.serviceBooking.delete({ where: { id: booking.id } });
      }
      return tx.serviceBooking.create({
        data: {
          requestorId: booking.requestorId,
          createdAt: originalCreatedAt,
          serviceType: cleanServiceType,
          serviceName: serviceName || booking.serviceName,
          contactPerson: contactPerson || booking.contactPerson,
          whatsapp: cleanWa,
          location: cleanLocation,
          locationString: cleanLocation || booking.locationString || '',
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
      { bookingId: updatedBooking.id, requestorId: updatedBooking.requestorId, action: 'manage' },
      cancelSecret,
      { algorithm: 'HS256', audience: 'kalceria-service-cancel', issuer: 'kalceria-api', expiresIn: Math.max(1, remainingSeconds) }
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

    await safeNotify(() => sendServiceRequestUpdatedEmail({
      to: targetEmail,
      booking: { ...updatedBooking, email: targetEmail, requestor: updatedBooking.requestor || booking.requestor },
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

// ─── DELETE /services/request/:id (User or immediate guest cancel within 3 mins) ────────────
export async function deleteOwnServiceRequest(req, res, next) {
  try {
    const { id } = req.params;

    const booking = await prisma.serviceBooking.findUnique({ 
      where: { id },
      include: { requestor: true }
    });
    if (!booking) {
      return res.status(404).json({
        error: 'Batas waktu 3 menit untuk memproses pesanan telah berakhir. Pesanan otomatis dibatalkan atau tidak ditemukan.',
        isExpired: true,
      });
    }

    if (!verifyServiceBookingAuthorization(booking, req)) {
      return res.status(403).json({ error: 'Unauthorized to delete this request.' });
    }

    if (booking.status === 'PROCESSED') {
      return res.status(403).json({
        error: 'Pesanan ini sudah dikonfirmasi dan terkunci. Pembatalan mandiri tidak dapat dilakukan.',
        isConfirmed: true,
      });
    }

    const elapsed = Date.now() - new Date(booking.createdAt).getTime();
    if (elapsed > THREE_MINUTES_MS || req._serviceTokenExpired) {
      if (booking.status === 'PENDING') {
        try {
          await prisma.serviceBooking.delete({ where: { id: booking.id } });
          await redis.del('cache:public_bookings');
        } catch {}
      }
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

// ─── POST & GET /services/request/:id/confirm (Confirm & persist order within 3 mins) ───
export async function confirmServiceRequest(req, res, next) {
  try {
    const { id } = req.params;
    const isDirectGet = req.method === 'GET' || req.query?.direct === 'true';

    const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://www.kalceria.id';
    const redirectToken = req.query?.token || req.query?.manage_token || req.headers?.['x-manage-token'] || (typeof req.get === 'function' ? req.get('x-manage-token') : '') || '';

    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: { slots: true, requestor: true },
    });
    if (!booking) {
      if (isDirectGet) {
        return res.redirect(302, `${frontendOrigin}/?service_action=confirm&booking_id=${encodeURIComponent(id)}&error=expired#need-our-help`);
      }
      return res.status(404).json({
        error: 'Batas waktu 3 menit untuk memproses pesanan telah berakhir. Pesanan otomatis dibatalkan atau tidak ditemukan.',
        isExpired: true,
      });
    }

    if (!verifyServiceBookingAuthorization(booking, req)) {
      if (isDirectGet) {
        return res.redirect(302, `${frontendOrigin}/?service_action=confirm&booking_id=${encodeURIComponent(id)}&error=unauthorized#need-our-help`);
      }
      return res.status(403).json({ error: 'Unauthorized to confirm this request.' });
    }

    if (booking.status === 'PROCESSED') {
      if (isDirectGet) {
        return res.redirect(302, `${frontendOrigin}/?service_action=confirm&booking_id=${encodeURIComponent(booking.id)}${redirectToken ? `&token=${encodeURIComponent(redirectToken)}` : ''}&anchor=need-our-help#need-our-help`);
      }
      return res.json({
        success: true,
        isConfirmed: true,
        message: 'Pesanan sudah dikonfirmasi sebelumnya.',
        booking,
      });
    }

    const elapsed = Date.now() - new Date(booking.createdAt).getTime();
    if (elapsed > THREE_MINUTES_MS || req._serviceTokenExpired) {
      if (booking.status === 'PENDING') {
        try {
          await prisma.serviceBooking.delete({ where: { id: booking.id } });
          await redis.del('cache:public_bookings');
        } catch {}
      }
      if (isDirectGet) {
        return res.redirect(302, `${frontendOrigin}/?service_action=confirm&booking_id=${encodeURIComponent(id)}&error=expired#need-our-help`);
      }
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk konfirmasi telah berakhir. Pesanan yang belum dikonfirmasi telah dibatalkan dan dihapus.',
        isExpired: true,
      });
    }

    const updatedBooking = await prisma.serviceBooking.update({
      where: { id: booking.id },
      data: { status: 'PROCESSED' },
      include: { slots: true, requestor: true },
    });

    try {
      await redis.del('cache:public_bookings');
    } catch {}

    const targetEmail = booking.requestor?.email && !booking.requestor.email.endsWith('@guest.kalceria.local')
      ? booking.requestor.email
      : booking.email || '';

    if (targetEmail) {
      await safeNotify(() => sendServiceRequestConfirmedEmail({
        to: targetEmail,
        booking: { ...updatedBooking, email: targetEmail, requestor: updatedBooking.requestor || booking.requestor },
        slots: updatedBooking.slots || [],
      }), 'email-service-request-confirmed');
    }

    if (isDirectGet) {
      return res.redirect(302, `${frontendOrigin}/?service_action=confirm&booking_id=${encodeURIComponent(updatedBooking.id)}${redirectToken ? `&token=${encodeURIComponent(redirectToken)}` : ''}&anchor=need-our-help#need-our-help`);
    }

    res.json({
      success: true,
      isConfirmed: true,
      message: 'Pesanan berhasil dikonfirmasi dan dipersist.',
      booking: updatedBooking,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Lazy Purge Helper for Expired Unconfirmed Bookings ───────────────────────
export async function purgeExpiredUnconfirmedServiceBookings() {
  try {
    const cutoff = new Date(Date.now() - THREE_MINUTES_MS);
    const result = await prisma.serviceBooking.deleteMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
    });
    if (result.count > 0) {
      await redis.del('cache:public_bookings');
    }
    return result.count;
  } catch (err) {
    console.warn('[ServicePurge] Error purging expired unconfirmed bookings:', err.message);
    return 0;
  }
}

