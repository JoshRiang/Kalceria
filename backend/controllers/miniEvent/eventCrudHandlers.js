import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { withEventMediaLock } from './eventMediaQueue.js';
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
  hydrateAndPruneEventMedia,
  parseSubmittedMediaItems,
  persistEventMediaSelection,
  planEventMediaSelection,
  purgeEventMediaByIds,
  saveEventMediaItems,
} from './eventMediaStore.js';
import {
  getUserActiveCollabRequest,
  hydrateEventCollabSummary,
  purgeEventCollabByIds,
} from './eventCollabStore.js';

export const CREATOR_SELECT = {
  id: true,
  name: true,
  nickname: true,
  email: true,
  profilePicture: true,
  coverImage: true,
  coverType: true,
  bio: true,
  phone: true,
  socialPlatform: true,
  socialLink: true,
  createdAt: true,
};

export async function invalidateMiniEventsCache() {
  try {
    await redis.del('cache:mini_events:active_list:v1');
  } catch {}
}

export async function hydrateFullMiniEvent(ev) {
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

    await invalidateMiniEventsCache();
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

    const isDefaultFirstPage = limit === 100 && !cursor;
    const cacheKey = 'cache:mini_events:active_list:v1';
    let hydratedEvents = null;
    let nextCursor = null;

    if (isDefaultFirstPage) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          hydratedEvents = parsed.events;
          nextCursor = parsed.nextCursor;
        }
      } catch {}
    }

    if (!hydratedEvents) {
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
      hydratedEvents = await Promise.all(rawPage.map((ev) => hydrateFullMiniEvent(ev)));
      const lastEvent = rawPage.at(-1);
      nextCursor = hasMore && lastEvent
        ? encodePageCursor({ id: lastEvent.id, at: lastEvent.createdAt })
        : null;

      if (isDefaultFirstPage) {
        await redis.set(cacheKey, JSON.stringify({ events: hydratedEvents, nextCursor }), 'EX', 4).catch(() => {});
      }
    }

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

    return await withEventMediaLock(id, async () => {
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
          req.body.mediaSyncedAt,
          creatorId
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

      await invalidateMiniEventsCache();
      const formatted = await hydrateFullMiniEvent(event);
      return res.json({ event: formatted });
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteMiniEvent(req, res, next) {
  try {
    const creatorId = req.user.userId;
    const { id } = req.params;

    return await withEventMediaLock(id, async () => {
      const event = await prisma.miniEvent.findFirst({
        where: { id, creatorId, isActive: true },
      });

      if (!event) return res.status(404).json({ error: 'No mini event found.' });

      await prisma.miniEvent.update({
        where: { id },
        data: { isActive: false, expiresAt: new Date(0) },
      });

      Promise.allSettled([
        purgeEventMediaByIds([id]),
        purgeEventCollabByIds([id]),
        invalidateMiniEventsCache(),
      ]).catch(() => {});

      return res.json({ message: 'Mini event deleted.' });
    });
  } catch (err) {
    return next(err);
  }
}

