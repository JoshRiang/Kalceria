import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { safeNotify, sendEventPaymentConfirmedEmail, sendEventRegistrationUpdatedEmail } from '../../lib/mailer.js';
import { clearEventRegistrationCooldown } from '../../middleware/ingressDefense.js';
import { renderConfirmResultHtml } from '../comms/confirmResultHtml.js';
import { WA_ADMIN, THREE_MINUTES_MS } from './eventRegistrationConstants.js';
import { verifyEventRegistrationAuthorization } from './eventRegistrationAuth.js';
import { buildEventRegistrationWaMessage } from '../comms/waMessageBuilder.js';

// ─── GET /events/registration/:id (Inspect for manage/cancel within 3 mins) ───
export async function getEventRegistrationForManage(req, res, next) {
  try {
    const { id } = req.params;
    const registration = await prisma.eventRegistration.findUnique({
      where: { id },
      include: { event: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!registration) {
      return res.status(404).json({
        error: 'Batas waktu 3 menit untuk mengonfirmasi pendaftaran event telah berakhir. Pendaftaran otomatis dibatalkan atau tidak ditemukan.',
        isExpired: true,
      });
    }

    if (!verifyEventRegistrationAuthorization(registration, req)) {
      return res.status(403).json({ error: 'Unauthorized to manage this registration.' });
    }

    if (registration.paymentStatus === 'CONFIRMED') {
      return res.json({
        registration,
        isConfirmed: true,
        remainingSeconds: 0,
      });
    }

    const elapsed = Date.now() - new Date(registration.createdAt).getTime();
    if (elapsed > THREE_MINUTES_MS || req._eventTokenExpired) {
      if (registration.paymentStatus === 'PENDING') {
        try {
          await prisma.eventRegistration.delete({ where: { id: registration.id } });
        } catch {}
      }
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk mengonfirmasi pendaftaran event telah berakhir. Pendaftaran yang belum dikonfirmasi telah dibatalkan.',
        isExpired: true,
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((THREE_MINUTES_MS - elapsed) / 1000));
    res.json({
      registration,
      remainingSeconds,
      isConfirmed: false,
    });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /events/registration/:id (Atomic Update within 3 mins) ──────────────
export async function updateEventRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const { selectedSession, name, contact } = req.body || {};

    const registration = await prisma.eventRegistration.findUnique({
      where: { id },
      include: { event: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!registration) {
      return res.status(404).json({
        error: 'Batas waktu 3 menit untuk memproses pesanan telah berakhir. Pendaftaran otomatis dibatalkan atau tidak ditemukan.',
        isExpired: true,
      });
    }

    if (!verifyEventRegistrationAuthorization(registration, req)) {
      return res.status(403).json({ error: 'Unauthorized to update this registration.' });
    }

    if (registration.paymentStatus === 'CONFIRMED') {
      return res.status(409).json({
        error: 'Pendaftaran ini sudah terkonfirmasi dan terkunci. Perubahan tidak dapat dilakukan.',
        isConfirmed: true,
      });
    }

    const elapsed = Date.now() - new Date(registration.createdAt).getTime();
    const remainingSeconds = Math.max(0, Math.ceil((THREE_MINUTES_MS - elapsed) / 1000));
    if (elapsed > THREE_MINUTES_MS || req._eventTokenExpired) {
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk mengedit pendaftaran telah berakhir.',
        isExpired: true,
      });
    }

    const cleanSession = (typeof selectedSession === 'string' && selectedSession.trim())
      ? selectedSession.trim()
      : registration.selectedSession;

    const cleanName = (typeof name === 'string' && name.trim()) ? name.trim() : registration.user?.name;
    const cleanContact = (typeof contact === 'string' && contact.trim()) ? contact.trim() : registration.user?.phone;

    // Atomically update registration and guest user
    const updatedReg = await prisma.$transaction(async (tx) => {
      if (cleanName || cleanContact) {
        try {
          await tx.user.update({
            where: { id: registration.userId },
            data: {
              ...(cleanName && { name: cleanName }),
              ...(cleanContact && { phone: cleanContact }),
            },
          });
        } catch {}
      }

      return tx.eventRegistration.update({
        where: { id: registration.id },
        data: {
          selectedSession: cleanSession,
          version: { increment: 1 },
        },
        include: { event: true, user: { select: { id: true, name: true, email: true, phone: true } } },
      });
    });

    const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
    const cancelToken = jwt.sign(
      { registrationId: updatedReg.id, userId: updatedReg.userId, action: 'manage' },
      cancelSecret,
      { algorithm: 'HS256', issuer: 'kalceria-api', expiresIn: Math.max(1, remainingSeconds) }
    );

    const waMsg = buildEventRegistrationWaMessage({
      event: updatedReg.event,
      registration: updatedReg,
      user: { id: updatedReg.userId, name: cleanName, email: updatedReg.user?.email, phone: cleanContact },
      isUpdate: true,
    });
    const whatsappUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(waMsg)}`;

    await safeNotify(() => sendEventRegistrationUpdatedEmail({
      to: updatedReg.user.email,
      event: updatedReg.event,
      registration: updatedReg,
      cancelToken,
    }), 'email-event-reg-update');

    res.json({
      success: true,
      registration: updatedReg,
      whatsappUrl,
      cancelToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST & GET /events/registration/:id/confirm (Confirm & persist order within 3 mins) ─
export async function confirmEventRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const isDirectGet = req.method === 'GET' || req.query?.direct === 'true';

    const frontendOrigin = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://www.kalceria.id';
    const redirectToken = req.query?.token || req.query?.manage_token || req.headers?.['x-manage-token'] || (typeof req.get === 'function' ? req.get('x-manage-token') : '') || '';

    const registration = await prisma.eventRegistration.findUnique({
      where: { id },
      include: { event: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!registration) {
      if (isDirectGet) {
        return res.redirect(302, `${frontendOrigin}/events?event_action=confirm&registration_id=${encodeURIComponent(id)}&error=expired#see-event`);
      }
      return res.status(404).json({
        error: 'Batas waktu 3 menit untuk mengonfirmasi pendaftaran event telah berakhir. Pendaftaran otomatis dibatalkan atau tidak ditemukan.',
        isExpired: true,
      });
    }

    if (!verifyEventRegistrationAuthorization(registration, req)) {
      if (isDirectGet) {
        return res.redirect(302, `${frontendOrigin}/events?event_action=confirm&registration_id=${encodeURIComponent(id)}&error=unauthorized#see-event`);
      }
      return res.status(403).json({ error: 'Unauthorized to confirm this registration.' });
    }

    if (registration.paymentStatus === 'CONFIRMED') {
      if (isDirectGet) {
        return res.redirect(302, `${frontendOrigin}/events?event_action=confirm&registration_id=${encodeURIComponent(registration.id)}${redirectToken ? `&token=${encodeURIComponent(redirectToken)}` : ''}&anchor=see-event#see-event`);
      }
      return res.json({
        success: true,
        isConfirmed: true,
        message: 'Pendaftaran sudah dikonfirmasi sebelumnya.',
        registration,
      });
    }

    const elapsed = Date.now() - new Date(registration.createdAt).getTime();
    if (elapsed > THREE_MINUTES_MS || req._eventTokenExpired) {
      if (registration.paymentStatus === 'PENDING') {
        try {
          await prisma.eventRegistration.delete({ where: { id: registration.id } });
        } catch {}
      }
      if (isDirectGet) {
        return res.redirect(302, `${frontendOrigin}/events?event_action=confirm&registration_id=${encodeURIComponent(id)}&error=expired#see-event`);
      }
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk konfirmasi telah berakhir. Pendaftaran telah dibatalkan dan dihapus.',
        isExpired: true,
      });
    }

    const updatedReg = await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { paymentStatus: 'CONFIRMED', version: { increment: 1 } },
      include: { event: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    });

    await safeNotify(() => sendEventPaymentConfirmedEmail({
      to: updatedReg.user.email,
      event: updatedReg.event,
      registration: updatedReg,
    }), 'email-event-confirmed');

    if (isDirectGet) {
      return res.redirect(302, `${frontendOrigin}/events?event_action=confirm&registration_id=${encodeURIComponent(updatedReg.id)}${redirectToken ? `&token=${encodeURIComponent(redirectToken)}` : ''}&anchor=see-event#see-event`);
    }

    res.json({
      success: true,
      isConfirmed: true,
      message: 'Pendaftaran event berhasil dikonfirmasi dan dipersist.',
      registration: updatedReg,
    });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /events/registration/:id (User cancel within 3 mins) ──────────────
export async function deleteOwnEventRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const registration = await prisma.eventRegistration.findUnique({
      where: { id },
      include: { event: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!registration) {
      return res.status(404).json({
        error: 'Batas waktu 3 menit untuk mengonfirmasi pendaftaran event telah berakhir. Pendaftaran otomatis dibatalkan atau tidak ditemukan.',
        isExpired: true,
      });
    }

    if (!verifyEventRegistrationAuthorization(registration, req)) {
      return res.status(403).json({ error: 'Unauthorized to delete this registration.' });
    }

    if (registration.paymentStatus === 'CONFIRMED') {
      return res.status(403).json({
        error: 'Pendaftaran ini sudah dikonfirmasi dan terkunci. Pembatalan mandiri tidak dapat dilakukan.',
        isConfirmed: true,
      });
    }

    const elapsed = Date.now() - new Date(registration.createdAt).getTime();
    if (elapsed > THREE_MINUTES_MS || req._eventTokenExpired) {
      if (registration.paymentStatus === 'PENDING') {
        try {
          await prisma.eventRegistration.delete({ where: { id: registration.id } });
        } catch {}
      }
      return res.status(403).json({
        error: 'Batas waktu 3 menit untuk membatalkan pendaftaran telah berakhir.',
        isExpired: true,
      });
    }

    await prisma.eventRegistration.delete({ where: { id: registration.id } });
    await clearEventRegistrationCooldown(req, registration.eventId, registration.userId, registration.user?.email);
    res.json({ message: 'Pendaftaran event berhasil dibatalkan.' });
  } catch (err) {
    next(err);
  }
}

// ─── Lazy Purge Helper for Expired Unconfirmed Event Registrations ────────────
export async function purgeExpiredUnconfirmedEventRegistrations() {
  try {
    const cutoff = new Date(Date.now() - THREE_MINUTES_MS);
    const result = await prisma.eventRegistration.deleteMany({
      where: {
        paymentStatus: 'PENDING',
        createdAt: { lt: cutoff },
      },
    });
    return result.count;
  } catch (err) {
    console.warn('[EventPurge] Failed to purge expired unconfirmed registrations:', err.message);
    return 0;
  }
}

