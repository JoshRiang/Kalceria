import prisma from '../../lib/prisma.js';
import { createLog } from '../auditController.js';
import { safeNotify, sendEventPaymentConfirmedEmail } from '../../lib/mailer.js';
import { notifyEventPaymentConfirmed } from '../../lib/whatsappBroker.js';

// ─── ADMIN: GET /admin/registrations ─────────────────────────────────────────
export async function listRegistrations(req, res, next) {
  try {
    const { eventId } = req.query;
    const registrations = await prisma.eventRegistration.findMany({
      where: eventId ? { eventId } : {},
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        event: { select: { id: true, title: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ registrations });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: PATCH /admin/registrations/:id/payment ───────────────────────────
export async function confirmRegistrationPayment(req, res, next) {
  try {
    const { status, version } = req.body || {}; // 'CONFIRMED' | 'REJECTED'
    if (!['CONFIRMED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Payment status must be CONFIRMED or REJECTED.' });
    }
    if (version === undefined || version === null || !Number.isInteger(Number(version)) || Number(version) < 0) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required.' });
    }
    const reg = await prisma.$transaction(async (tx) => {
      const updated = await tx.eventRegistration.update({
        where: { id: req.params.id, version: Number(version) },
        data: { paymentStatus: status, version: { increment: 1 } },
        include: { user: { select: { id: true, name: true, email: true, phone: true } }, event: true },
      });
      if (status === 'CONFIRMED' && updated.eventId) {
        await tx.event.updateMany({
          where: { id: updated.eventId, quota: { gt: 0 } },
          data: { quota: { decrement: 1 } },
        });
      }
      return updated;
    });

    if (status === 'CONFIRMED') {
      safeNotify(() => notifyEventPaymentConfirmed({
        registration: reg,
        event: reg.event,
        user: reg.user,
      }), 'whatsapp-admin-confirm');

      safeNotify(() => sendEventPaymentConfirmedEmail({
        to: reg.user.email,
        event: reg.event,
        registration: reg,
      }), 'email-admin-confirm');
    }

    res.json({ registration: reg });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Data telah dimodifikasi oleh admin lain. Silakan refresh.' });
    }
    next(err);
  }
}

// ─── ADMIN: DELETE /admin/registrations/:id ───────────────────────────────────
export async function deleteRegistration(req, res, next) {
  try {
    const { version } = req.body || {};
    if (version === undefined || version === null || !Number.isInteger(Number(version)) || Number(version) < 0) {
      return res.status(400).json({ error: 'Optimistic Concurrency Control: Version is required for delete.' });
    }
    await prisma.$transaction(async (tx) => {
      const registration = await tx.eventRegistration.delete({
        where: { id: req.params.id, version: Number(version) },
        select: { id: true, eventId: true },
      });
      await createLog(
        req.user.email,
        'EVENT_REGISTRATION_DELETED',
        `Registration ${registration.id} for event ${registration.eventId} deleted.`,
        tx,
      );
    });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Data telah dimodifikasi oleh admin lain. Silakan refresh.' });
    }
    next(err);
  }
}

// ─── ADMIN: PATCH /admin/registrations/:id/pdf ───────────────────────────────
export async function markPdfExported(req, res, next) {
  try {
    await prisma.eventRegistration.update({
      where: { id: req.params.id },
      data: { pdfExported: true },
    });
    res.json({ message: 'PDF marked exported.' });
  } catch (err) {
    next(err);
  }
}

