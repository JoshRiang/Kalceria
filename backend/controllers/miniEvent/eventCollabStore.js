import crypto from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { ensurePersistentUserProfilesBatch, CANONICAL_USER_SELECT } from '../../utils/profileDefaults.js';

const acceptedKey = (eventId) => `mini_event:collab:accepted:${eventId}`;
const requestsKey = (eventId) => `mini_event:collab:requests:${eventId}`;
const userRequestKey = (userId) => `mini_event:collab:user_request:${userId}`;

async function readEventRequestsRaw(eventId) {
  try {
    const raw = await redis.get(requestsKey(eventId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r) => r && r.id && r.userId) : [];
  } catch {
    return [];
  }
}

async function writeEventRequestsRaw(eventId, requests) {
  const safe = Array.isArray(requests) ? requests.filter((r) => r && r.id && r.userId) : [];
  try {
    if (safe.length === 0) {
      await redis.del(requestsKey(eventId));
    } else {
      await redis.set(requestsKey(eventId), JSON.stringify(safe));
    }
  } catch {}
  return safe;
}

export async function getAcceptedCollaboratorIds(eventId, legacyCollabs = []) {
  try {
    const members = await redis.smembers(acceptedKey(eventId));
    const merged = Array.from(new Set([...(legacyCollabs || []), ...(members || [])])).filter(Boolean);
    return merged;
  } catch {
    return Array.isArray(legacyCollabs) ? legacyCollabs : [];
  }
}

export async function addAcceptedCollaboratorId(eventId, userId) {
  if (!eventId || !userId) return;
  try {
    await redis.sadd(acceptedKey(eventId), String(userId));
  } catch {}
}

export async function getUserActiveCollabRequest(userId) {
  if (!userId) return null;
  try {
    const raw = await redis.get(userRequestKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.eventId) return null;
    const activeEvent = await prisma.miniEvent.findFirst({
      where: {
        id: parsed.eventId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!activeEvent) {
      await redis.del(userRequestKey(userId)).catch(() => {});
      return null;
    }
    const reqList = await readEventRequestsRaw(parsed.eventId);
    const stillPending = reqList.some((r) => String(r.userId) === String(userId));
    if (!stillPending) {
      await redis.del(userRequestKey(userId)).catch(() => {});
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function createCollabRequest(eventId, userId) {
  const existingUserReq = await getUserActiveCollabRequest(userId);
  if (existingUserReq) {
    if (String(existingUserReq.eventId) === String(eventId)) {
      return { alreadyRequestedThis: true, request: existingUserReq };
    }
    return { activeElsewhere: true, existing: existingUserReq };
  }

  const existingList = await readEventRequestsRaw(eventId);
  const existingOnEvent = existingList.find((r) => String(r.userId) === String(userId));
  if (existingOnEvent) {
    await redis
      .set(userRequestKey(userId), JSON.stringify({ eventId, requestId: existingOnEvent.id }))
      .catch(() => {});
    return { alreadyRequestedThis: true, request: existingOnEvent };
  }

  const newReq = {
    id: crypto.randomUUID(),
    eventId: String(eventId),
    userId: String(userId),
    createdAt: Date.now(),
  };

  await writeEventRequestsRaw(eventId, [...existingList, newReq]);
  await redis
    .set(userRequestKey(userId), JSON.stringify({ eventId: String(eventId), requestId: newReq.id }))
    .catch(() => {});

  return { created: true, request: newReq };
}

export async function cancelCollabRequest(eventId, userId) {
  const existingList = await readEventRequestsRaw(eventId);
  const filtered = existingList.filter((r) => String(r.userId) !== String(userId));
  await writeEventRequestsRaw(eventId, filtered);
  await redis.del(userRequestKey(userId)).catch(() => {});
  return { cancelled: filtered.length !== existingList.length };
}

export async function listEnrichedCollabRequests(eventId) {
  const rawList = await readEventRequestsRaw(eventId);
  if (rawList.length === 0) return [];

  let effectiveList = rawList;
  if (prisma?.miniEvent) {
    try {
      const ev = await prisma.miniEvent.findUnique({
        where: { id: String(eventId) },
        select: { creatorId: true },
      });
      if (ev?.creatorId) {
        const blockedUsers = await redis.smembers(`blocked:${ev.creatorId}`).catch(() => []);
        if (blockedUsers.length > 0) {
          const blockedSet = new Set(blockedUsers.map(String));
          effectiveList = rawList.filter((r) => !blockedSet.has(String(r.userId)));
        }
      }
    } catch {}
  }
  if (effectiveList.length === 0) return [];

  const userIds = Array.from(new Set(effectiveList.map((r) => String(r.userId))));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: CANONICAL_USER_SELECT,
  });
  const enrichedUsers = await ensurePersistentUserProfilesBatch(users);
  const userMap = new Map(enrichedUsers.map((u) => [String(u.id), u]));

  const validRaw = [];
  const enriched = [];
  for (const reqItem of effectiveList) {
    const profile = userMap.get(String(reqItem.userId));
    if (!profile) continue;
    validRaw.push(reqItem);
    enriched.push({
      id: reqItem.id,
      eventId: reqItem.eventId,
      createdAt: new Date(reqItem.createdAt).toISOString(),
      user: {
        id: profile.id,
        name: profile.name,
        displayName: profile.displayName || profile.name,
        nickname: profile.nickname,
        profilePicture: profile.profilePicture,
      },
    });
  }

  if (validRaw.length !== rawList.length) {
    await writeEventRequestsRaw(eventId, validRaw);
  }
  return enriched;
}

export async function resolveCollabRequestDecision(eventId, requestId, accept) {
  const rawList = await readEventRequestsRaw(eventId);
  const target = rawList.find((r) => String(r.id) === String(requestId));
  if (!target) {
    return { notFound: true };
  }

  const remaining = rawList.filter((r) => String(r.id) !== String(requestId));
  await writeEventRequestsRaw(eventId, remaining);
  await redis.del(userRequestKey(target.userId)).catch(() => {});

  if (accept) {
    await addAcceptedCollaboratorId(eventId, target.userId);
  }

  const collaborators = await getAcceptedCollaboratorIds(eventId);
  return {
    resolved: true,
    accepted: Boolean(accept),
    targetUserId: target.userId,
    collaborators,
    pendingRequestsCount: remaining.length,
  };
}

export async function hydrateEventCollabSummary(ev, legacyCollabs = []) {
  if (Array.isArray(legacyCollabs) && legacyCollabs.length > 0) {
    await Promise.allSettled(
      legacyCollabs.map((cid) => addAcceptedCollaboratorId(ev.id, cid))
    );
  }
  const [collaborators, rawReqs] = await Promise.all([
    getAcceptedCollaboratorIds(ev.id, legacyCollabs),
    readEventRequestsRaw(ev.id),
  ]);

  let effectiveRawReqs = rawReqs;
  if (ev?.creatorId) {
    try {
      const blockedUsers = await redis.smembers(`blocked:${ev.creatorId}`).catch(() => []);
      if (blockedUsers.length > 0) {
        const blockedSet = new Set(blockedUsers.map(String));
        effectiveRawReqs = rawReqs.filter((r) => !blockedSet.has(String(r.userId)));
      }
    } catch {}
  }

  let collaboratorProfiles = [];
  if (collaborators.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: collaborators } },
      select: CANONICAL_USER_SELECT,
    });
    const enriched = await ensurePersistentUserProfilesBatch(users);
    collaboratorProfiles = enriched.map((u) => ({
      id: u.id,
      name: u.name,
      displayName: u.displayName || u.name,
      nickname: u.nickname,
      profilePicture: u.profilePicture,
      coverImage: u.coverImage,
      coverType: u.coverType,
      bio: u.bio,
      phone: u.phone,
      socialPlatform: u.socialPlatform,
      socialLink: u.socialLink,
    }));
  }

  return {
    collaborators: collaboratorProfiles.length > 0 ? collaboratorProfiles.map((u) => u.id) : collaborators,
    collaboratorProfiles,
    pendingRequestsCount: effectiveRawReqs.length,
  };
}

export async function purgeEventCollabByIds(eventIds) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) return;
  for (const eventId of eventIds) {
    const rawReqs = await readEventRequestsRaw(eventId);
    await Promise.allSettled([
      ...rawReqs.map((r) => redis.del(userRequestKey(r.userId))),
      redis.del(requestsKey(eventId)),
      redis.del(acceptedKey(eventId)),
    ]);
  }
}

export async function removeUserFromAllEventCollabs(userId, activeEvents = []) {
  const uid = String(userId);
  await redis.del(userRequestKey(uid)).catch(() => {});

  for (const ev of activeEvents) {
    await redis.srem(acceptedKey(ev.id), uid).catch(() => {});
    const reqList = await readEventRequestsRaw(ev.id);
    const filteredReqs = reqList.filter((r) => String(r.userId) !== uid);
    if (filteredReqs.length !== reqList.length) {
      await writeEventRequestsRaw(ev.id, filteredReqs);
    }
  }
}
