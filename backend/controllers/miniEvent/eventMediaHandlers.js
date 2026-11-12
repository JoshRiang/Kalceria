import prisma from '../../lib/prisma.js';
import { withEventMediaLock } from './eventMediaQueue.js';
import { cleanText, extractEncodedTags } from './eventFormatting.js';
import {
  appendClipsToEventMedia,
  parseSubmittedMediaItems,
  recordClipView,
  removeClipFromEventMedia,
} from './eventMediaStore.js';
import { getAcceptedCollaboratorIds } from './eventCollabStore.js';
import {
  CREATOR_SELECT,
  hydrateFullMiniEvent,
  invalidateMiniEventsCache,
} from './eventCrudHandlers.js';

export async function addMiniEventMedia(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const mediaUrl = cleanText(req.body.mediaUrl);
    const hasItems = Array.isArray(req.body.mediaItems) && req.body.mediaItems.length > 0;
    if (!mediaUrl && !hasItems) {
      return res.status(400).json({ error: 'Media URL is required.' });
    }

    return await withEventMediaLock(id, async () => {
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
        select: { id: true, name: true, nickname: true, profilePicture: true },
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
        authorAvatarUrl: uploader?.profilePicture || null,
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

      await invalidateMiniEventsCache();
      const formatted = await hydrateFullMiniEvent(event);
      return res.json({ event: formatted });
    });
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

    return await withEventMediaLock(id, async () => {
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
      await invalidateMiniEventsCache();
      const formatted = await hydrateFullMiniEvent(event);
      return res.json({ event: formatted });
    });
  } catch (err) {
    return next(err);
  }
}

export async function recordEventMediaView(req, res, next) {
  try {
    const { id: eventId, clipId } = req.params;
    const userId = req.user?.userId || null;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'anon';
    const viewerKey = userId ? `u:${userId}` : `ip:${ip}`;

    const viewCount = await recordClipView({
      eventId,
      clipId,
      viewerKey,
      viewerUserId: userId,
    });

    return res.json({ success: true, clipId, viewCount });
  } catch (err) {
    return next(err);
  }
}

