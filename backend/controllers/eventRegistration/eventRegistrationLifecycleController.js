import prisma from '../../lib/prisma.js';
import { safeNotify, sendEventPaymentConfirmedEmail } from '../../lib/mailer.js';
import { clearEventRegistrationCooldown } from '../../middleware/ingressDefense.js';
import { renderConfirmResultHtml } from '../comms/confirmResultHtml.js';
import { THREE_MINUTES_MS } from './eventRegistrationConstants.js';
import { verifyEventRegistrationAuthorization } from './eventRegistrationAuth.js';

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

// ─── POST & GET /events/registration/:id/confirm (Confirm & persist order within 3 mins) ─
export async function confirmEventRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const isDirectGet = req.method === 'GET' || req.query?.direct === 'true';

    const registration = await prisma.eventRegistration.findUnique({
      where: { id },
      include: { event: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!registration) {
      if (isDirectGet) {
        return res.status(404).send(renderConfirmResultHtml({
          status: 'NOT_FOUND',
          title: 'Pendaftaran Tidak Ditemukan',
          description: 'Batas waktu 3 menit untuk mengonfirmasi pendaftaran telah berakhir atau pendaftaran telah dibatalkan.',
        }));
      }
      return res.status(404).json({
        error: 'Batas waktu 3 menit untuk mengonfirmasi pendaftaran event telah berakhir. Pendaftaran otomatis dibatalkan atau tidak ditemukan.',
        isExpired: true,
      });
    }

    if (!verifyEventRegistrationAuthorization(registration, req)) {
      if (isDirectGet) {
        return res.status(403).send(renderConfirmResultHtml({
          status: 'UNAUTHORIZED',
          title: 'Akses Tidak Diizinkan',
          description: 'Token otorisasi pendaftaran tidak valid atau telah kadaluarsa.',
        }));
      }
      return res.status(403).json({ error: 'Unauthorized to confirm this registration.' });
    }

    if (registration.paymentStatus === 'CONFIRMED') {
      if (isDirectGet) {
        return res.status(200).send(renderConfirmResultHtml({
          status: 'ALREADY_CONFIRMED',
          title: 'Pendaftaran Sudah Dikonfirmasi',
          description: 'Pendaftaran event ini sudah berhasil dikonfirmasi sebelumnya dan slot kamu telah terkunci.',
          registrationId: registration.id,
          autoClose: true,
        }));
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
        return res.status(403).send(renderConfirmResultHtml({
          status: 'EXPIRED',
          title: 'Batas Waktu 3 Menit Telah Berakhir',
          description: 'Batas waktu 3 menit untuk konfirmasi telah berakhir. Pendaftaran otomatis dibatalkan dan dihapus.',
          isExpired: true,
        }));
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

    safeNotify(() => sendEventPaymentConfirmedEmail({
      to: updatedReg.user.email,
      event: updatedReg.event,
      registration: updatedReg,
    }), 'email-event-confirmed');

    if (isDirectGet) {
      return res.status(200).send(renderConfirmResultHtml({
        status: 'SUCCESS',
        title: 'Pendaftaran Event Berhasil Dikonfirmasi & Dipersist',
        description: 'Slot pendaftaran kamu telah resmi dikonfirmasi dan terkunci ke sistem operasional Kalceria. Kamu dapat menutup tab ini dan kembali ke email.',
        registrationId: updatedReg.id,
        autoClose: true,
      }));
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

