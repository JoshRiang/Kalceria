import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { storeCanonicalEventNotification } from '../../services/canonicalFallbackStore.js';
import { cleanText, extractEncodedTags } from './eventFormatting.js';
import {
  addAcceptedCollaboratorId,
  cancelCollabRequest,
  createCollabRequest,
  getAcceptedCollaboratorIds,
  listEnrichedCollabRequests,
  resolveCollabRequestDecision,
} from './eventCollabStore.js';
import {
  CREATOR_SELECT,
  hydrateFullMiniEvent,
  invalidateMiniEventsCache,
} from './eventCrudHandlers.js';

export async function addMiniEventCollaborator(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;
    const collaboratorId = cleanText(req.body.collaboratorId);
    if (!collaboratorId) {
      return res.status(400).json({ error: 'Collaborator ID is required.' });
    }

    const event = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true },
      include: { creator: { select: CREATOR_SELECT } },
    });
    if (!event) {
      return res.status(404).json({ error: 'Mini event not found or unauthorized.' });
    }

    await addAcceptedCollaboratorId(id, collaboratorId);
    await invalidateMiniEventsCache();
    const formatted = await hydrateFullMiniEvent(event);
    return res.json({ event: formatted });
  } catch (err) {
    return next(err);
  }
}

export async function requestMiniEventCollab(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const event = await prisma.miniEvent.findFirst({
      where: { id, isActive: true, expiresAt: { gt: new Date() } },
      select: { id: true, creatorId: true, description: true },
    });
    if (!event) {
      return res.status(404).json({ error: 'Mini event not found.' });
    }
    if (String(event.creatorId) === String(userId)) {
      return res.status(400).json({ error: 'You cannot request collaboration on your own event.' });
    }

    const tags = extractEncodedTags(event.description);
    const accepted = await getAcceptedCollaboratorIds(id, tags.collaborators);
    if (accepted.some((cid) => String(cid) === String(userId))) {
      return res.json({ alreadyCollaborator: true, requestedEventId: null });
    }

    // Suppress request if creator has blocked this user so it NEVER reaches Envelope Request
    const isBlockedByCreator = Number(await redis.sismember(`blocked:${event.creatorId}`, String(userId)).catch(() => 0)) === 1;
    if (isBlockedByCreator) {
      const dummyReqId = crypto.randomUUID();
      await redis
        .set(`mini_event:collab:user_request:${userId}`, JSON.stringify({ eventId: String(id), requestId: dummyReqId }))
        .catch(() => {});
      return res.status(201).json({
        request: {
          id: dummyReqId,
          eventId: String(id),
          userId: String(userId),
          createdAt: Date.now(),
        },
        requestedEventId: id,
      });
    }

    const outcome = await createCollabRequest(id, userId);
    if (outcome.activeElsewhere) {
      return res.status(409).json({
        error: 'You already have an active collaboration request on another event.',
        requestedEventId: outcome.existing.eventId,
      });
    }

    if (outcome.request && event.creatorId) {
      try {
        const creatorId = String(event.creatorId);
        const reqNotif = {
          type: 'collab_request',
          eventId: id,
          eventTitle: event.title || 'Event',
          requestId: outcome.request.id,
          user: outcome.request.user,
          createdAt: outcome.request.createdAt || new Date().toISOString(),
        };
        const notifPipe = redis.pipeline();
        notifPipe.lpush(`notif:events:${creatorId}`, JSON.stringify(reqNotif));
        notifPipe.ltrim(`notif:events:${creatorId}`, 0, 19);
        notifPipe.expire(`notif:events:${creatorId}`, 86400);
        notifPipe.set(`chat:inbox_ver:${creatorId}`, `${Date.now()}_evreq`, 'EX', 86400);
        await notifPipe.exec();
        storeCanonicalEventNotification(creatorId, reqNotif).catch(() => {});
      } catch {}
    }

    return res.status(outcome.created ? 201 : 200).json({
      request: outcome.request,
      requestedEventId: id,
    });
  } catch (err) {
    return next(err);
  }
}

export async function cancelMiniEventCollabRequest(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const event = await prisma.miniEvent.findUnique({
      where: { id },
      select: { creatorId: true },
    }).catch(() => null);

    const result = await cancelCollabRequest(id, userId);
    if (result.cancelled && event?.creatorId) {
      try {
        const creatorId = String(event.creatorId);
        const cancelNotif = {
          type: 'collab_cancelled',
          eventId: id,
          userId: String(userId),
          createdAt: new Date().toISOString(),
        };
        const notifPipe = redis.pipeline();
        notifPipe.lpush(`notif:events:${creatorId}`, JSON.stringify(cancelNotif));
        notifPipe.ltrim(`notif:events:${creatorId}`, 0, 19);
        notifPipe.expire(`notif:events:${creatorId}`, 86400);
        notifPipe.set(`chat:inbox_ver:${creatorId}`, `${Date.now()}_evcancel`, 'EX', 86400);
        await notifPipe.exec();
        storeCanonicalEventNotification(creatorId, cancelNotif).catch(() => {});
      } catch {}
    }
    return res.json({
      cancelled: result.cancelled,
      requestedEventId: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMiniEventCollabRequests(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;

    const event = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true },
      select: { id: true },
    });
    if (!event) {
      return res.status(404).json({ error: 'Mini event not found or unauthorized.' });
    }

    const requests = await listEnrichedCollabRequests(id);
    return res.json({ requests });
  } catch (err) {
    return next(err);
  }
}

export async function acceptMiniEventCollab(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id, requestId } = req.params;

    const event = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true },
      include: { creator: { select: CREATOR_SELECT } },
    });
    if (!event) {
      return res.status(404).json({ error: 'Mini event not found or unauthorized.' });
    }

    const result = await resolveCollabRequestDecision(id, requestId, true);
    if (result.notFound) {
      return res.status(404).json({ error: 'Collaboration request not found.' });
    }

    const formatted = await hydrateFullMiniEvent(event);
    return res.json({ event: formatted, acceptedUserId: result.targetUserId });
  } catch (err) {
    return next(err);
  }
}

export async function declineMiniEventCollab(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id, requestId } = req.params;

    const event = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true },
      include: { creator: { select: CREATOR_SELECT } },
    });
    if (!event) {
      return res.status(404).json({ error: 'Mini event not found or unauthorized.' });
    }

    const result = await resolveCollabRequestDecision(id, requestId, false);
    if (result.notFound) {
      return res.status(404).json({ error: 'Collaboration request not found.' });
    }

    await invalidateMiniEventsCache();
    const formatted = await hydrateFullMiniEvent(event);
    return res.json({ event: formatted });
  } catch (err) {
    return next(err);
  }
}

