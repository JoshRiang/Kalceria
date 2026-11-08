import prisma from '../../lib/prisma.js';
import { decodePageCursor, encodePageCursor, parsePageLimit } from '../../utils/cursorPagination.js';
import { resolveIndonesianReverseGeo } from '../geoController.js';
import { ensurePersistentUserProfile } from '../../utils/profileDefaults.js';
import {
  MINI_EVENT_PERMANENT_EXPIRES_AT,
  buildEncodedDescription,
  cleanText,
  extractEncodedTags,
  formatMiniEventResponse,
  parseCoordinate,
  toSmartTitleCase,
  validateMiniEvent,
} from './eventFormatting.js';
import {
  appendClipsToEventMedia,
  hydrateAndPruneEventMedia,
  parseSubmittedMediaItems,
  persistEventMediaSelection,
  planEventMediaSelection,
  purgeEventMediaByIds,
  removeClipFromEventMedia,
  saveEventMediaItems,
} from './eventMediaStore.js';
import {
  addAcceptedCollaboratorId,
  cancelCollabRequest,
  createCollabRequest,
  getAcceptedCollaboratorIds,
  getUserActiveCollabRequest,
  hydrateEventCollabSummary,
  listEnrichedCollabRequests,
  purgeEventCollabByIds,
  resolveCollabRequestDecision,
} from './eventCollabStore.js';

const CREATOR_SELECT = {
  id: true,
  name: true,
  nickname: true,
  profilePicture: true,
};

async function hydrateFullMiniEvent(ev) {
  if (!ev) return null;
  if (ev.creator) {
    ev.creator = await ensurePersistentUserProfile(ev.creator);
  }
  const creatorName = ev.creator?.displayName || ev.creator?.name || null;
  const tags = extractEncodedTags(ev.description);
  const [mediaData, collabData] = await Promise.all([
    hydrateAndPruneEventMedia(ev, creatorName),
    hydrateEventCollabSummary(ev, tags.collaborators),
  ]);
  return formatMiniEventResponse(ev, { ...mediaData, ...collabData });
}

export async function createMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const title = toSmartTitleCase(cleanText(req.body.title));
    const rawDescription = cleanText(req.body.description);
    const extracted = extractEncodedTags(rawDescription);
    const category = cleanText(req.body.category) || extracted.category || 'cafe';
    const mediaUrlInput = req.body.mediaUrl !== undefined ? cleanText(req.body.mediaUrl) : extracted.mediaStr;
    let location = cleanText(req.body.location) || extracted.location || '';
    const lat = parseCoordinate(req.body.lat);
    const lng = parseCoordinate(req.body.lng);

    if (!location && lat !== null && lng !== null) {
      try {
        const geoData = await resolveIndonesianReverseGeo(lat, lng);
        if (geoData?.formatted) {
          location = geoData.formatted;
        }
      } catch {}
    }

    const creatorProfile = await prisma.user.findUnique({
      where: { id: creatorId },
      select: CREATOR_SELECT,
    });

    const parsedMedia = parseSubmittedMediaItems({
      mediaUrl: mediaUrlInput,
      mediaItems: req.body.mediaItems,
      authorId: creatorId,
      authorName: creatorProfile?.name || null,
    });
    if (!parsedMedia.valid) {
      return res.status(400).json({ error: parsedMedia.error || 'Format URL media tidak valid.' });
    }

    const description = buildEncodedDescription({
      category,
      location,
      mediaUrls: parsedMedia.clips.map((c) => c.url),
      plainDescription: extracted.plainDescription,
    });

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

    const expiredOld = await prisma.miniEvent.findMany({
      where: { creatorId, expiresAt: { lte: new Date() } },
      select: { id: true },
    });
    if (expiredOld.length > 0) {
      const oldIds = expiredOld.map((e) => e.id);
      await prisma.miniEvent.deleteMany({ where: { id: { in: oldIds } } });
      await Promise.allSettled([purgeEventMediaByIds(oldIds), purgeEventCollabByIds(oldIds)]);
    }

    const event = await prisma.miniEvent.create({
      data: {
        creatorId,
        title,
        description,
        lat,
        lng,
        expiresAt: MINI_EVENT_PERMANENT_EXPIRES_AT,
      },
      include: { creator: { select: CREATOR_SELECT } },
    });

    if (parsedMedia.clips.length > 0) {
      await saveEventMediaItems(event.id, parsedMedia.clips);
    }

    const formatted = await hydrateFullMiniEvent(event);
    return res.status(201).json({ event: formatted });
  } catch (err) {
    return next(err);
  }
}

export async function getActiveMiniEvents(req, res, next) {
  try {
    const limit = parsePageLimit(req.query.limit, 100, 100);
    const cursor = decodePageCursor(req.query.cursor);
    if (limit === null || cursor === false) {
      return res.status(400).json({ error: 'Pagination limit or cursor is invalid.' });
    }

    const events = await prisma.miniEvent.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
        creator: {
          isEmailVerified: true,
          role: 'USER',
          email: {
            notIn: [
              'admin1@gmail.com',
              'admin2@gmail.com',
              'admin3@gmail.com',
              'admin4@gmail.com',
            ],
          },
        },
        ...(cursor && {
          OR: [
            { createdAt: { lt: cursor.at } },
            { createdAt: cursor.at, id: { lt: cursor.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { creator: { select: CREATOR_SELECT } },
    });

    const hasMore = events.length > limit;
    const rawPage = events.slice(0, limit);
    const hydratedEvents = await Promise.all(rawPage.map((ev) => hydrateFullMiniEvent(ev)));
    const lastEvent = rawPage.at(-1);
    const nextCursor = hasMore && lastEvent
      ? encodePageCursor({ id: lastEvent.id, at: lastEvent.createdAt })
      : null;

    const myActiveReq = req.user?.userId
      ? await getUserActiveCollabRequest(req.user.userId)
      : null;

    return res.json({
      events: hydratedEvents,
      nextCursor,
      requestedEventId: myActiveReq?.eventId || null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;

    const existing = await prisma.miniEvent.findFirst({
      where: { id, creatorId, isActive: true },
      include: { creator: { select: CREATOR_SELECT } },
    });
    if (!existing) {
      return res.status(404).json({ error: 'No active mini event found.' });
    }

    const existingTags = extractEncodedTags(existing.description);
    const title = toSmartTitleCase(cleanText(req.body.title));
    const rawDescInput = cleanText(req.body.description);
    const inputTags = extractEncodedTags(rawDescInput);
    const category = cleanText(req.body.category) || inputTags.category || existingTags.category || 'cafe';
    let location = cleanText(req.body.location) || inputTags.location || '';
    const lat = parseCoordinate(req.body.lat);
    const lng = parseCoordinate(req.body.lng);

    if (!location && lat !== null && lng !== null) {
      try {
        const geoData = await resolveIndonesianReverseGeo(lat, lng);
        if (geoData?.formatted) {
          location = geoData.formatted;
        }
      } catch {}
    }

    let finalClips;
    let mediaPlan = null;
    const hasExplicitMediaField =
      req.body.mediaUrl !== undefined || req.body.mediaItems !== undefined;

    const currentHydrated = await hydrateAndPruneEventMedia(existing, existing.creator?.name || null);
    if (hasExplicitMediaField) {
      const parsedMedia = parseSubmittedMediaItems({
        mediaUrl: req.body.mediaUrl,
        mediaItems: req.body.mediaItems,
        authorId: creatorId,
        authorName: existing.creator?.name || null,
      });
      if (!parsedMedia.valid) {
        return res.status(400).json({ error: parsedMedia.error || 'Format URL media tidak valid.' });
      }
      mediaPlan = planEventMediaSelection(
        currentHydrated.mediaItems,
        parsedMedia.clips,
        req.body.mediaSyncedAt
      );
      finalClips = mediaPlan.finalClips;
    } else {
      finalClips = currentHydrated.mediaItems;
    }

    const description = buildEncodedDescription({
      category,
      location,
      mediaUrls: finalClips.map((c) => c.url),
      plainDescription: inputTags.plainDescription,
    });

    const error = validateMiniEvent({ title, description, lat, lng });
    if (error) return res.status(400).json({ error });

    const event = await prisma.miniEvent.update({
      where: { id },
      data: {
        title,
        description,
        lat,
        lng,
        expiresAt: MINI_EVENT_PERMANENT_EXPIRES_AT,
      },
      include: { creator: { select: CREATOR_SELECT } },
    });

    if (mediaPlan) {
      await persistEventMediaSelection(id, mediaPlan);
    }

    const formatted = await hydrateFullMiniEvent(event);
    return res.json({ event: formatted });
  } catch (err) {
    return next(err);
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

    await Promise.allSettled([
      purgeEventMediaByIds([id]),
      purgeEventCollabByIds([id]),
    ]);

    return res.json({ message: 'Mini event deleted.' });
  } catch (err) {
    return next(err);
  }
}

export async function addMiniEventMedia(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const mediaUrl = cleanText(req.body.mediaUrl);
    const hasItems = Array.isArray(req.body.mediaItems) && req.body.mediaItems.length > 0;
    if (!mediaUrl && !hasItems) {
      return res.status(400).json({ error: 'Media URL is required.' });
    }

    const event = await prisma.miniEvent.findFirst({
      where: { id, isActive: true, expiresAt: { gt: new Date() } },
      include: { creator: { select: CREATOR_SELECT } },
    });
    if (!event) {
      return res.status(404).json({ error: 'Mini event not found.' });
    }

    const tags = extractEncodedTags(event.description);
    const acceptedCollabs = await getAcceptedCollaboratorIds(id, tags.collaborators);
    const isCreator = String(event.creatorId) === String(userId);
    const isCollab = acceptedCollabs.some((cid) => String(cid) === String(userId));

    if (!isCreator && !isCollab) {
      return res.status(403).json({ error: 'Not authorized to add media to this event.' });
    }

    const uploader = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, nickname: true },
    });

    const parsedMedia = parseSubmittedMediaItems({
      mediaUrl,
      mediaItems: req.body.mediaItems || (mediaUrl ? [{
        url: mediaUrl,
        width: req.body.width,
        height: req.body.height,
        duration: req.body.duration,
      }] : undefined),
      authorId: userId,
      authorName: uploader?.name || uploader?.nickname || 'Kalcerian',
    });

    if (!parsedMedia.valid || parsedMedia.clips.length === 0) {
      return res.status(400).json({ error: parsedMedia.error || 'Format URL media tidak valid.' });
    }

    const result = await appendClipsToEventMedia(
      event,
      parsedMedia.clips,
      event.creator?.name || null
    );
    event.description = result.updatedDescription;

    const formatted = await hydrateFullMiniEvent(event);
    return res.json({ event: formatted });
  } catch (err) {
    return next(err);
  }
}

export async function deleteMiniEventMedia(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const clipId = cleanText(req.body?.clipId || req.query?.clipId);
    const url = cleanText(req.body?.url || req.query?.url);
    if (!clipId && !url) {
      return res.status(400).json({ error: 'Clip identifier is required.' });
    }

    const event = await prisma.miniEvent.findFirst({
      where: { id, isActive: true },
      include: { creator: { select: CREATOR_SELECT } },
    });
    if (!event) {
      return res.status(404).json({ error: 'Mini event not found.' });
    }

    const removal = await removeClipFromEventMedia(event, { clipId, url }, userId);
    if (removal.forbidden) {
      return res.status(403).json({ error: 'Not authorized to remove this media item.' });
    }
    if (removal.notFound) {
      return res.status(404).json({ error: 'Media item not found.' });
    }

    event.description = removal.updatedDescription;
    const formatted = await hydrateFullMiniEvent(event);
    return res.json({ event: formatted });
  } catch (err) {
    return next(err);
  }
}

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

    const outcome = await createCollabRequest(id, userId);
    if (outcome.activeElsewhere) {
      return res.status(409).json({
        error: 'You already have an active collaboration request on another event.',
        requestedEventId: outcome.existing.eventId,
      });
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
    const result = await cancelCollabRequest(id, userId);
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

    const formatted = await hydrateFullMiniEvent(event);
    return res.json({ event: formatted });
  } catch (err) {
    return next(err);
  }
}

