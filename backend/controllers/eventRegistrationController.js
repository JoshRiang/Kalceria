import prisma from '../lib/prisma.js';
import { createLog } from './auditController.js';
import { decodePageCursor, encodePageCursor, parsePageLimit } from '../utils/cursorPagination.js';


const WA_ADMIN = process.env.WA_ADMIN_NUMBER || '6281234567890';

// ─── POST /events/:eventId/register ──────────────────────────────────────────
export async function registerEvent(req, res, next) {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;
    const { selectedSession } = req.body || {};
    if (typeof selectedSession !== 'string' || !selectedSession.trim() || selectedSession.length > 120) {
      return res.status(400).json({ error: 'Please select a valid event session.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "events" WHERE "id" = ${eventId} FOR UPDATE`;
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) return { error: 'NOT_FOUND' };
      if (event.status !== 'OPEN') return { error: 'CLOSED' };

      const now = new Date();
      if (now < event.regStartTime || now > event.regEndTime) return { error: 'WINDOW' };
      if (!Array.isArray(event.sessionOptions) || !event.sessionOptions.includes(selectedSession)) {
        return { error: 'SESSION' };
      }

      const count = await tx.eventRegistration.count({ where: { eventId } });
      if (count >= event.quota) return { error: 'FULL' };

      const registration = await tx.eventRegistration.create({
        data: { userId, eventId, selectedSession },
        include: { user: { select: { name: true, email: true, phone: true } }, event: true },
      });
      return { event, reg: registration };
    });

    if (result.error === 'NOT_FOUND') return res.status(404).json({ error: 'Event not found.' });
    if (result.error === 'CLOSED') return res.status(400).json({ error: 'Registration is closed.' });
    if (result.error === 'WINDOW') return res.status(400).json({ error: 'Registration is not in active window.' });
    if (result.error === 'SESSION') return res.status(400).json({ error: 'Please select a valid event session.' });
    if (result.error === 'FULL') return res.status(400).json({ error: 'Event is full.' });
    const { event, reg } = result;

    const msg = [
      `📋 PENDAFTARAN EVENT BARU`,
      ``,
      `Event: ${event.title}`,
      `Sesi: ${selectedSession}`,
      `Peserta: ${reg.user.name} (${reg.user.email})`,
      `Biaya: Rp ${event.price.toLocaleString('id-ID')}`,
      ``,
      `Segera konfirmasi pembayaran!`,
    ].join('\n');

    const whatsappUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;
    res.status(201).json({ registration: reg, whatsappUrl });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already registered for this event.' });
    next(err);
  }
}

// ─── GET /events (public listing) ────────────────────────────────────────────
export async function listPublicEvents(req, res, next) {
  try {
    const limit = parsePageLimit(req.query.limit, 50, 100);
    const cursor = decodePageCursor(req.query.cursor);
    if (limit === null || cursor === false) {
      return res.status(400).json({ error: 'Pagination limit or cursor is invalid.' });
    }

    const events = await prisma.event.findMany({
      where: {
        status: { not: 'DRAFT' },
        ...(cursor && {
          AND: [{
            OR: [
              { regStartTime: { gt: cursor.at } },
              { regStartTime: cursor.at, id: { gt: cursor.id } },
            ],
          }],
        }),
      },
      orderBy: [{ regStartTime: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      select: {
        id: true, title: true, description: true, displayPhotoUrl: true,
        location: true, regStartTime: true, regEndTime: true,
        sessionOptions: true, price: true, quota: true, status: true,
        _count: { select: { registrations: true } },
      },
    });
    const hasMore = events.length > limit;
    const pageEvents = events.slice(0, limit);
    const lastEvent = pageEvents.at(-1);
    const nextCursor = hasMore && lastEvent
      ? encodePageCursor({ id: lastEvent.id, at: lastEvent.regStartTime })
      : null;

    res.json({ events: pageEvents, nextCursor });
  } catch (err) {
    next(err);
  }
}

// ─── GET /events/:eventId (public detail) ────────────────────────────────────
export async function getPublicEvent(req, res, next) {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.eventId, status: { not: 'DRAFT' } },
      include: { _count: { select: { registrations: true } } },
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    res.json({ event });
  } catch (err) {
    next(err);
  }
}

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
    const reg = await prisma.eventRegistration.update({
      where: { id: req.params.id, version: Number(version) },
      data: { paymentStatus: status, version: { increment: 1 } },
      include: { user: { select: { name: true, email: true } }, event: { select: { title: true } } },
    });
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
