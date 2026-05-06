import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

// ─── Custom PK Generator: EVT-YYYYMM-XXXX ────────────────────────────────────
function generateEventId() {
  const ym = format(new Date(), 'yyyyMM');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `EVT-${ym}-${rand}`;
}

// ─── POST /admin/events ───────────────────────────────────────────────────────
export async function createEvent(req, res, next) {
  try {
    const { title, displayPhotoUrl, regStartTime, regEndTime, sessionOptions, price } = req.body;

    if (new Date(regEndTime) <= new Date(regStartTime)) {
      return res.status(400).json({ error: 'regEndTime must be after regStartTime.' });
    }

    const id = generateEventId();
    const event = await prisma.event.create({
      data: {
        id,
        title,
        displayPhotoUrl,
        regStartTime: new Date(regStartTime),
        regEndTime: new Date(regEndTime),
        sessionOptions,
        price,
      },
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/events ────────────────────────────────────────────────────────
export async function listEvents(req, res, next) {
  try {
    const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ events });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/events/:id ────────────────────────────────────────────────────
export async function updateEvent(req, res, next) {
  try {
    const { id } = req.params;
    const { title, displayPhotoUrl, regStartTime, regEndTime, sessionOptions, price } = req.body;

    if (regStartTime && regEndTime && new Date(regEndTime) <= new Date(regStartTime)) {
      return res.status(400).json({ error: 'regEndTime must be after regStartTime.' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(displayPhotoUrl && { displayPhotoUrl }),
        ...(regStartTime && { regStartTime: new Date(regStartTime) }),
        ...(regEndTime && { regEndTime: new Date(regEndTime) }),
        ...(sessionOptions && { sessionOptions }),
        ...(price !== undefined && { price }),
      },
    });

    res.json({ event });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /admin/events/:id ─────────────────────────────────────────────────
export async function deleteEvent(req, res, next) {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    next(err);
  }
}
