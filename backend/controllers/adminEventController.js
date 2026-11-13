import prisma from '../lib/prisma.js';
import { format } from 'date-fns';
import { randomInt } from 'node:crypto';
import { createLog } from './auditController.js';
import {
  getEligibleMinigameParticipants,
  calculateVoucherWinnersCount,
  selectVoucherWinners,
  awardEventVouchers,
} from './minigame/minigameVoucherService.js';
import {
  isAllowedEventVideoUrl,
  processAndStoreEventVideo,
} from './eventVideoController.js';



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
  if (owns('videoUrl') && fields.videoUrl != null && fields.videoUrl !== '' && !isAllowedEventVideoUrl(fields.videoUrl)) return 'Video URL must be HTTPS, site-relative, or valid video data URL.';
  if ((requireAll || owns('regStartTime')) && !Number.isFinite(new Date(fields.regStartTime).getTime())) return 'Registration start time is invalid.';
  if ((requireAll || owns('regEndTime')) && !Number.isFinite(new Date(fields.regEndTime).getTime())) return 'Registration end time is invalid.';
  if (owns('regStartTime') && owns('regEndTime') && new Date(fields.regEndTime) <= new Date(fields.regStartTime)) return 'Registration end time must be after start time.';
  if ((requireAll || owns('sessionOptions')) && (!Array.isArray(fields.sessionOptions) || fields.sessionOptions.length > 20 || fields.sessionOptions.some((value) => typeof value !== 'string' || !value.trim() || value.length > 120))) return 'Provide up to 20 valid session options.';
  if ((requireAll || owns('price')) && (!Number.isFinite(Number(fields.price)) || Number(fields.price) < 0 || Number(fields.price) > 1_000_000_000)) return 'Price must be a non-negative amount.';
  if ((requireAll || owns('quota')) && (!Number.isInteger(Number(fields.quota)) || Number(fields.quota) < 1 || Number(fields.quota) > 100000)) return 'Quota must be between 1 and 100000.';
  if (owns('status') && !['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'].includes(fields.status)) return 'Invalid event status.';
  if (owns('isMinigameTarget') && typeof fields.isMinigameTarget !== 'boolean') return 'isMinigameTarget must be a boolean.';
  if (owns('isTarget') && typeof fields.isTarget !== 'boolean') return 'isTarget must be a boolean.';
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
    const { title, description, displayPhotoUrl, videoUrl, location, regStartTime, regEndTime, sessionOptions, price, quota, status, isMinigameTarget, isTarget } = req.body || {};
    const validationError = validateEventFields(req.body || {}, true);
    if (validationError) return res.status(400).json({ error: validationError });

    const targetFlag = isMinigameTarget !== undefined
      ? Boolean(isMinigameTarget)
      : (isTarget !== undefined ? Boolean(isTarget) : false);

    if (targetFlag) {
      await prisma.event.updateMany({
        where: { isMinigameTarget: true },
        data: { isMinigameTarget: false },
      });
    }

    const id = generateEventId();
    const processedVideo = videoUrl !== undefined
      ? await processAndStoreEventVideo(id, { videoUrl, videoDataUrl: typeof videoUrl === 'string' && videoUrl.startsWith('data:video/') ? videoUrl : undefined })
      : { videoUrl: null, videoMeta: null };

    const event = await prisma.event.create({
      data: {
        id, title, description, displayPhotoUrl,
        videoUrl: processedVideo.videoUrl,
        videoMeta: processedVideo.videoMeta,
        location, regStartTime: new Date(regStartTime),
        regEndTime: new Date(regEndTime), sessionOptions,
        price: Number(price), quota: Number(quota), status: status || 'OPEN',
        isMinigameTarget: targetFlag,
        targetAssignedAt: targetFlag ? new Date() : null,
      },
    });
    res.status(201).json({ event: { ...event, isTarget: event.isMinigameTarget } });
  } catch (err) { next(err); }
}

// ─── GET /admin/events ────────────────────────────────────────────────────────
export async function listEvents(req, res, next) {
  try {
    const rawEvents = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { registrations: true } } },
    });
    const events = rawEvents.map((e) => ({ ...e, isTarget: e.isMinigameTarget }));
    res.json({ events });
  } catch (err) { next(err); }
}

// ─── PUT /admin/events/:id ────────────────────────────────────────────────────
export async function updateEvent(req, res, next) {
  try {
    const { id } = req.params;
    const fields = req.body || {};
    const { title, description, displayPhotoUrl, videoUrl, location, regStartTime, regEndTime, sessionOptions, price, quota, status, isMinigameTarget, isTarget } = fields;
    const validationError = validateEventFields(fields);
    if (validationError) return res.status(400).json({ error: validationError });

    const targetFlag = isMinigameTarget !== undefined
      ? Boolean(isMinigameTarget)
      : (isTarget !== undefined ? Boolean(isTarget) : undefined);

    if (targetFlag === true) {
      await prisma.event.updateMany({
        where: { id: { not: id }, isMinigameTarget: true },
        data: { isMinigameTarget: false },
      });
    }

    const hasVideoUpdate = Object.hasOwn(fields, 'videoUrl');
    const processedVideo = hasVideoUpdate
      ? await processAndStoreEventVideo(id, { videoUrl, videoDataUrl: typeof videoUrl === 'string' && videoUrl.startsWith('data:video/') ? videoUrl : undefined })
      : null;

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(displayPhotoUrl && { displayPhotoUrl }),
        ...(hasVideoUpdate && {
          videoUrl: processedVideo.videoUrl,
          videoMeta: processedVideo.videoMeta,
        }),
        ...(location !== undefined && { location }),
        ...(regStartTime && { regStartTime: new Date(regStartTime) }),
        ...(regEndTime && { regEndTime: new Date(regEndTime) }),
        ...(sessionOptions && { sessionOptions }),
        ...(price !== undefined && { price: Number(price) }),
        ...(quota !== undefined && { quota: Number(quota) }),
        ...(status && { status }),
        ...(targetFlag !== undefined && {
          isMinigameTarget: targetFlag,
          targetAssignedAt: targetFlag ? new Date() : null,
        }),
      },
    });
    res.json({ event: { ...event, isTarget: event.isMinigameTarget } });
  } catch (err) { next(err); }
}

// ─── PUT /admin/events/:id/target (Convenience Route) ────────────────────────
export async function setEventTarget(req, res, next) {
  try {
    const { id } = req.params;
    const targetFlag = req.body?.isTarget !== undefined
      ? Boolean(req.body.isTarget)
      : (req.body?.isMinigameTarget !== undefined ? Boolean(req.body.isMinigameTarget) : true);

    if (targetFlag) {
      await prisma.event.updateMany({
        where: { id: { not: id }, isMinigameTarget: true },
        data: { isMinigameTarget: false },
      });
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        isMinigameTarget: targetFlag,
        targetAssignedAt: targetFlag ? new Date() : null,
      },
    });

    res.json({ success: true, event: { ...event, isTarget: event.isMinigameTarget } });
  } catch (err) { next(err); }
}

// ─── DELETE /admin/events/:id ─────────────────────────────────────────────────
export async function deleteEvent(req, res, next) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.delete({ where: { id: req.params.id } });
      await createLog(req.user.email, 'EVENT_DELETED', `Event ${req.params.id} deleted.`, tx);
    });
    res.json({ message: 'Event deleted.' });
  } catch (err) { next(err); }
}

// ─── GET /admin/events/:id/vouchers ──────────────────────────────────────────
export async function getEventVouchers(req, res, next) {
  try {
    const { id } = req.params;
    const { event, eligibleUsers } = await getEligibleMinigameParticipants(id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const voucherCount = calculateVoucherWinnersCount(event.quota);
    const { winners, candidates, cutoffScoreMs } = selectVoucherWinners(eligibleUsers, voucherCount);

    res.json({
      success: true,
      eventId: event.id,
      eventTitle: event.title,
      quota: event.quota,
      voucherCount,
      cutoffScoreMs,
      totalEligible: eligibleUsers.length,
      totalCandidates: candidates.length,
      candidates,
      winners,
    });
  } catch (err) { next(err); }
}

// ─── POST /admin/events/:id/vouchers/draw ─────────────────────────────────────
export async function drawEventVouchers(req, res, next) {
  try {
    const { id } = req.params;
    const result = await awardEventVouchers(id, prisma, {
      sendEmails: req.body?.sendEmails !== false,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}
