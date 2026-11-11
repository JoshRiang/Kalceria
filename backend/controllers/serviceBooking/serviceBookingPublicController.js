import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { THREE_MINUTES_MS } from './serviceBookingConstants.js';
import { purgeExpiredUnconfirmedServiceBookings } from './serviceBookingLifecycleController.js';
import { renderTimerBadgeSvg, renderTimerBadgeGif } from '../comms/timerBadgeRenderer.js';

// ─── GET /services/bookings (Public for Heatmap) ───────────────────────────
export async function listPublicServiceBookings(req, res, next) {
  try {
    // Purge expired unconfirmed bookings lazily in background
    purgeExpiredUnconfirmedServiceBookings().catch(() => {});

    const cacheKey = 'cache:public_bookings';
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const cutoff = new Date(Date.now() - THREE_MINUTES_MS);
    const slots = await prisma.serviceBookingSlot.findMany({
      include: {
        serviceBooking: {
          select: { status: true, createdAt: true }
        }
      },
      where: {
        serviceBooking: {
          OR: [
            { status: 'PROCESSED' },
            { status: 'PENDING', createdAt: { gte: cutoff } }
          ]
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

    // Cache for 5 seconds (rapid near-realtime slot contention during war booking)
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 5);

    res.json(response);
  } catch (err) {
    next(err);
  }
}

// ─── GET /services/request/:id/timer.svg & timer.gif (Dynamic Email Timer & Status Badge) ─
export async function getServiceBookingTimerBadge(req, res, next) {
  try {
    const { id } = req.params;
    const isGif = req.path?.endsWith('.gif') || req.originalUrl?.includes('.gif') || req.headers?.accept?.includes('image/gif');

    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      select: { status: true, createdAt: true },
    });

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!booking) {
      if (isGif) {
        const gif = renderTimerBadgeGif({ status: 'EXPIRED' });
        res.setHeader('Content-Type', 'image/gif');
        return res.send(gif);
      }
      const svg = renderTimerBadgeSvg({ status: 'NOT_FOUND' });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    const elapsedMs = Date.now() - new Date(booking.createdAt).getTime();
    if (isGif) {
      const gif = renderTimerBadgeGif({
        status: booking.status,
        elapsedMs,
        limitMs: THREE_MINUTES_MS,
      });
      res.setHeader('Content-Type', 'image/gif');
      return res.send(gif);
    }

    const svg = renderTimerBadgeSvg({
      status: booking.status,
      elapsedMs,
      limitMs: THREE_MINUTES_MS,
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) {
    next(err);
  }
}


