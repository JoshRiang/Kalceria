import prisma from '../lib/prisma.js';
import { format } from 'date-fns';
import { randomInt } from 'node:crypto';



function generateEventId() {
  const ym = format(new Date(), 'yyyyMM');
  const rand = String(randomInt(1000, 10000));
  return `EVT-${ym}-${rand}`;
}

function validateEventFields(fields, requireAll = false) {
  const owns = (key) => Object.hasOwn(fields, key);
  if ((requireAll || owns('title')) && (typeof fields.title !== 'string' || !fields.title.trim() || fields.title.length > 120)) return 'Title must be between 1 and 120 characters.';
  if ((requireAll || owns('description')) && fields.description != null && (typeof fields.description !== 'string' || fields.description.length > 5000)) return 'Description must be 5000 characters or less.';
  if ((requireAll || owns('location')) && fields.location != null && (typeof fields.location !== 'string' || fields.location.length > 200)) return 'Location must be 200 characters or less.';
  if ((requireAll || owns('displayPhotoUrl')) && (typeof fields.displayPhotoUrl !== 'string' || fields.displayPhotoUrl.length > 2048 || !isAllowedImageUrl(fields.displayPhotoUrl))) return 'Photo URL must be HTTPS or a site-relative path.';
  if ((requireAll || owns('regStartTime')) && !Number.isFinite(new Date(fields.regStartTime).getTime())) return 'Registration start time is invalid.';
  if ((requireAll || owns('regEndTime')) && !Number.isFinite(new Date(fields.regEndTime).getTime())) return 'Registration end time is invalid.';
  if (owns('regStartTime') && owns('regEndTime') && new Date(fields.regEndTime) <= new Date(fields.regStartTime)) return 'Registration end time must be after start time.';
  if ((requireAll || owns('sessionOptions')) && (!Array.isArray(fields.sessionOptions) || fields.sessionOptions.length > 20 || fields.sessionOptions.some((value) => typeof value !== 'string' || !value.trim() || value.length > 120))) return 'Provide up to 20 valid session options.';
  if ((requireAll || owns('price')) && (!Number.isFinite(Number(fields.price)) || Number(fields.price) < 0 || Number(fields.price) > 1_000_000_000)) return 'Price must be a non-negative amount.';
  if ((requireAll || owns('quota')) && (!Number.isInteger(Number(fields.quota)) || Number(fields.quota) < 1 || Number(fields.quota) > 100000)) return 'Quota must be between 1 and 100000.';
  if (owns('status') && !['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'].includes(fields.status)) return 'Invalid event status.';
  return null;
}

function isAllowedImageUrl(value) {
  const clean = value.trim();
  if (clean.startsWith('/') && !clean.startsWith('//') && !clean.includes('\\')) return true;
  try { return new URL(clean).protocol === 'https:'; } catch { return false; }
}

// ─── POST /admin/events ───────────────────────────────────────────────────────
export async function createEvent(req, res, next) {
  try {
    const { title, description, displayPhotoUrl, location, regStartTime, regEndTime, sessionOptions, price, quota, status } = req.body || {};
    const validationError = validateEventFields(req.body || {}, true);
    if (validationError) return res.status(400).json({ error: validationError });

    const id = generateEventId();
    const event = await prisma.event.create({
      data: {
        id, title, description, displayPhotoUrl,
        location, regStartTime: new Date(regStartTime),
        regEndTime: new Date(regEndTime), sessionOptions,
        price: Number(price), quota: Number(quota), status: status || 'OPEN',
      },
    });
    res.status(201).json({ event });
  } catch (err) { next(err); }
}

// ─── GET /admin/events ────────────────────────────────────────────────────────
export async function listEvents(req, res, next) {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { registrations: true } } },
    });
    res.json({ events });
  } catch (err) { next(err); }
}

// ─── PUT /admin/events/:id ────────────────────────────────────────────────────
export async function updateEvent(req, res, next) {
  try {
    const { id } = req.params;
    const fields = req.body || {};
    const { title, description, displayPhotoUrl, location, regStartTime, regEndTime, sessionOptions, price, quota, status } = fields;
    const validationError = validateEventFields(fields);
    if (validationError) return res.status(400).json({ error: validationError });

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(displayPhotoUrl && { displayPhotoUrl }),
        ...(location !== undefined && { location }),
        ...(regStartTime && { regStartTime: new Date(regStartTime) }),
        ...(regEndTime && { regEndTime: new Date(regEndTime) }),
        ...(sessionOptions && { sessionOptions }),
        ...(price !== undefined && { price: Number(price) }),
        ...(quota !== undefined && { quota: Number(quota) }),
        ...(status && { status }),
      },
    });
    res.json({ event });
  } catch (err) { next(err); }
}

// ─── DELETE /admin/events/:id ─────────────────────────────────────────────────
export async function deleteEvent(req, res, next) {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted.' });
  } catch (err) { next(err); }
}
