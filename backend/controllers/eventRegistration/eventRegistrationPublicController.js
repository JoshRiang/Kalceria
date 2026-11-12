import prisma from '../../lib/prisma.js';
import { decodePageCursor, encodePageCursor, parsePageLimit } from '../../utils/cursorPagination.js';
import { THREE_MINUTES_MS } from './eventRegistrationConstants.js';
import { purgeExpiredUnconfirmedEventRegistrations } from './eventRegistrationLifecycleController.js';
import { renderTimerBadgeSvg, renderTimerBadgeGif } from '../comms/timerBadgeRenderer.js';

// ─── GET /events (public listing) ────────────────────────────────────────────
export async function listPublicEvents(req, res, next) {
  try {
    purgeExpiredUnconfirmedEventRegistrations().catch(() => {});

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

// ─── GET /events/registration/:id/timer.svg & timer.gif (Dynamic Email Timer & Status Badge) ─
export async function getEventRegistrationTimerBadge(req, res, next) {
  try {
    const { id } = req.params;
    const isGif = req.path?.endsWith('.gif') || req.originalUrl?.includes('.gif') || req.headers?.accept?.includes('image/gif');

    const registration = await prisma.eventRegistration.findUnique({
      where: { id },
      select: { paymentStatus: true, createdAt: true },
    });

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!registration) {
      if (isGif) {
        const gif = renderTimerBadgeGif({ status: 'EXPIRED' });
        res.setHeader('Content-Type', 'image/gif');
        return res.send(gif);
      }
      const svg = renderTimerBadgeSvg({ status: 'NOT_FOUND' });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    const elapsedMs = Date.now() - new Date(registration.createdAt).getTime();
    if (isGif) {
      const gif = renderTimerBadgeGif({
        status: registration.paymentStatus,
        elapsedMs,
        limitMs: THREE_MINUTES_MS,
      });
      res.setHeader('Content-Type', 'image/gif');
      return res.send(gif);
    }

    const svg = renderTimerBadgeSvg({
      status: registration.paymentStatus,
      elapsedMs,
      limitMs: THREE_MINUTES_MS,
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) {
    next(err);
  }
}

// ─── GET /events/:eventId/check-email (Check if email is already registered) ──
export async function checkEventEmailRegistration(req, res, next) {
  try {
    const { eventId } = req.params;
    const rawEmail = typeof req.query?.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    if (!eventId || !rawEmail) {
      return res.json({ isRegistered: false });
    }

    // Lazy prune unconfirmed registrations older than 3 minutes
    const cutoff = new Date(Date.now() - THREE_MINUTES_MS);
    await prisma.eventRegistration.deleteMany({
      where: {
        eventId,
        paymentStatus: 'PENDING',
        createdAt: { lt: cutoff },
      },
    }).catch(() => {});

    const existing = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        user: { email: rawEmail },
      },
      select: { id: true, paymentStatus: true },
    });

    return res.json({
      isRegistered: Boolean(existing),
      paymentStatus: existing?.paymentStatus || null,
      isConfirmed: existing?.paymentStatus === 'CONFIRMED',
    });
  } catch (err) {
    next(err);
  }
}



