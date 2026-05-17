import prisma from '../lib/prisma.js';


const BROADCAST_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 120;

function cleanMessage(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateMessage(message) {
  if (!message) return 'Message is required.';
  if (message.length > MAX_MESSAGE_LENGTH) {
    return `Message must be ${MAX_MESSAGE_LENGTH} characters or less.`;
  }
  return null;
}

export async function getMyBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    const broadcast = await prisma.userBroadcast.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    res.json({ broadcast });
  } catch (err) {
    next(err);
  }
}

export async function createBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    const message = cleanMessage(req.body.message);
    const error = validateMessage(message);

    if (error) return res.status(400).json({ error });

    const existing = await prisma.userBroadcast.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (existing) {
      return res.status(409).json({ error: 'Broadcast already exists. Use PUT to update.' });
    }

    await prisma.userBroadcast.deleteMany({
      where: { userId, expiresAt: { lte: new Date() } },
    });

    const expiresAt = new Date(Date.now() + BROADCAST_TTL_MS);
    const broadcast = await prisma.userBroadcast.create({
      data: { userId, message, expiresAt },
    });

    res.status(201).json({ broadcast });
  } catch (err) {
    next(err);
  }
}

export async function updateBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    const message = cleanMessage(req.body.message);
    const error = validateMessage(message);

    if (error) return res.status(400).json({ error });

    const existing = await prisma.userBroadcast.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'No active broadcast found.' });
    }

    const broadcast = await prisma.userBroadcast.update({
      where: { userId },
      data: { message },
    });

    res.json({ broadcast });
  } catch (err) {
    next(err);
  }
}

export async function deleteBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    await prisma.userBroadcast.deleteMany({ where: { userId } });
    res.json({ message: 'Broadcast deleted.' });
  } catch (err) {
    next(err);
  }
}
