import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MINI_EVENT_TTL_MS = 24 * 60 * 60 * 1000;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateMiniEvent({ title, description, lat, lng }) {
  if (!title) return 'Title is required.';
  if (title.length > 80) return 'Title must be 80 characters or less.';
  if (description.length > 240) return 'Description must be 240 characters or less.';
  if (lat === null || lng === null) return 'Valid lat and lng are required.';
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'Valid lat and lng are required.';
  return null;
}

export async function createMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const title = cleanText(req.body.title);
    const description = cleanText(req.body.description);
    const lat = parseCoordinate(req.body.lat);
    const lng = parseCoordinate(req.body.lng);
    const error = validateMiniEvent({ title, description, lat, lng });

    if (error) return res.status(400).json({ error });

    const existing = await prisma.miniEvent.findFirst({
      where: {
        creatorId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Mini event already exists. Use PUT to update.' });
    }

    await prisma.miniEvent.deleteMany({
      where: { creatorId, expiresAt: { lte: new Date() } },
    });

    const expiresAt = new Date(Date.now() + MINI_EVENT_TTL_MS);
    const event = await prisma.miniEvent.create({
      data: { creatorId, title, description, lat, lng, expiresAt },
      include: {
        creator: {
          select: { id: true, name: true, nickname: true, profilePicture: true },
        },
      },
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

export async function getActiveMiniEvents(_req, res, next) {
  try {
    const events = await prisma.miniEvent.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        creator: {
          select: { id: true, name: true, nickname: true, profilePicture: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ events });
  } catch (err) {
    next(err);
  }
}

export async function updateMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;
    const title = cleanText(req.body.title);
    const description = cleanText(req.body.description);
    const lat = parseCoordinate(req.body.lat);
    const lng = parseCoordinate(req.body.lng);
    const error = validateMiniEvent({ title, description, lat, lng });

    if (error) return res.status(400).json({ error });

    const existing = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true, expiresAt: { gt: new Date() } },
    });

    if (!existing) return res.status(404).json({ error: 'No active mini event found.' });

    const event = await prisma.miniEvent.update({
      where: { id },
      data: { title, description, lat, lng },
      include: {
        creator: {
          select: { id: true, name: true, nickname: true, profilePicture: true },
        },
      },
    });

    res.json({ event });
  } catch (err) {
    next(err);
  }
}

export async function deleteMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;
    const event = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true },
    });

    if (!event) return res.status(404).json({ error: 'No mini event found.' });

    await prisma.miniEvent.update({
      where: { id },
      data: { isActive: false, expiresAt: new Date(0) },
    });

    res.json({ message: 'Mini event deleted.' });
  } catch (err) {
    next(err);
  }
}
