import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { ensurePersistentUserProfilesBatch, CANONICAL_USER_SELECT } from '../utils/profileDefaults.js';
import {
  acquireCanonicalCallLock,
  getCanonicalCallLock,
  releaseCanonicalCallLock,
} from './canonicalFallbackStore.js';

export const GROUP_ROLE_MAKER = 'MAKER';
export const GROUP_ROLE_COLLABORATOR = 'COLLABORATOR';
export const GROUP_ROLE_MEMBER = 'MEMBER';

const CALL_LOCK_TTL_SECONDS = 7200;
const acceptedCollabKey = (eventId) => `mini_event:collab:accepted:${eventId}`;
const collabRequestsKey = (eventId) => `mini_event:collab:requests:${eventId}`;
const userRequestKey = (userId) => `mini_event:collab:user_request:${userId}`;

let groupTablesChecked = false;

export async function ensureEventGroupTables() {
  if (groupTablesChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS event_group_meta (
        event_id VARCHAR(128) PRIMARY KEY,
        avatar_url TEXT,
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS event_group_members (
        event_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        role VARCHAR(24) NOT NULL DEFAULT 'MEMBER',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (event_id, user_id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS event_group_messages (
        id VARCHAR(128) PRIMARY KEY,
        event_id VARCHAR(128) NOT NULL,
        sender_id VARCHAR(128) NOT NULL,
        sender_name VARCHAR(160),
        sender_avatar TEXT,
        msg_type VARCHAR(32) DEFAULT 'text',
        payload_json TEXT NOT NULL,
        ts BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_event_group_messages_event_ts
      ON event_group_messages (event_id, ts DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS event_group_reads (
        event_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        last_read_ts BIGINT NOT NULL DEFAULT 0,
        cleared_at_ms BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (event_id, user_id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS event_group_calls (
        event_id VARCHAR(128) PRIMARY KEY,
        call_id VARCHAR(128) NOT NULL,
        call_mode VARCHAR(16) NOT NULL DEFAULT 'voice',
        initiator_id VARCHAR(128) NOT NULL,
        initiator_name VARCHAR(160),
        participant_ids_json TEXT NOT NULL DEFAULT '[]',
        started_at BIGINT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        active BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);
    groupTablesChecked = true;
  } catch (err) {
    console.warn('[EventGroupStore] ensureEventGroupTables error:', err?.message);
  }
}

export async function ensureMakerInGroup(eventId, creatorId) {
  if (!eventId || !creatorId) return;
  await ensureEventGroupTables();
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO event_group_members (event_id, user_id, role)
       VALUES ($1, $2, 'MAKER')
       ON CONFLICT (event_id, user_id) DO UPDATE SET role = 'MAKER'`,
      String(eventId),
      String(creatorId)
    );
  } catch (err) {
    console.warn('[EventGroupStore] ensureMakerInGroup error:', err?.message);
  }
}

/**
 * Envelope acceptance ONLY grants regular Group Member access (NO auto media collaborator upload rights).
 */
export async function addGroupMemberOnly(eventId, userId) {
  if (!eventId || !userId) return;
  await ensureEventGroupTables();
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO event_group_members (event_id, user_id, role)
       VALUES ($1, $2, 'MEMBER')
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      String(eventId),
      String(userId)
    );
  } catch (err) {
    console.warn('[EventGroupStore] addGroupMemberOnly error:', err?.message);
  }
}

export async function getEventGroupMemberIds(eventId) {
  if (!eventId) return [];
  await ensureEventGroupTables();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT user_id FROM event_group_members WHERE event_id = $1`,
      String(eventId)
    );
    return (rows || []).map((r) => String(r.user_id));
  } catch {
    return [];
  }
}

export async function getEventPromotedCollaboratorIds(eventId) {
  if (!eventId) return [];
  await ensureEventGroupTables();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT user_id FROM event_group_members WHERE event_id = $1 AND role = 'COLLABORATOR'`,
      String(eventId)
    );
    return (rows || []).map((r) => String(r.user_id));
  } catch {
    return [];
  }
}

export async function getMemberRoleInEvent(eventId, userId, creatorId = null) {
  if (!eventId || !userId) return null;
  if (creatorId && String(creatorId) === String(userId)) {
    await ensureMakerInGroup(eventId, creatorId);
    return GROUP_ROLE_MAKER;
  }
  await ensureEventGroupTables();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT role FROM event_group_members WHERE event_id = $1 AND user_id = $2 LIMIT 1`,
      String(eventId),
      String(userId)
    );
    if (Array.isArray(rows) && rows.length > 0) return String(rows[0].role);
  } catch {}
  return null;
}

export async function listEnrichedGroupMembers(eventId, creatorId = null) {
  await ensureEventGroupTables();
  if (creatorId) await ensureMakerInGroup(eventId, creatorId);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT user_id, role, joined_at FROM event_group_members WHERE event_id = $1 ORDER BY joined_at ASC`,
    String(eventId)
  );
  const userIds = (rows || []).map((r) => String(r.user_id));
  if (userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: CANONICAL_USER_SELECT,
  });
  const enriched = await ensurePersistentUserProfilesBatch(users);
  const profileMap = new Map(enriched.map((u) => [String(u.id), u]));
  const roleOrder = { MAKER: 0, COLLABORATOR: 1, MEMBER: 2 };

  return (rows || [])
    .map((r) => {
      const uid = String(r.user_id);
      const p = profileMap.get(uid);
      if (!p) return null;
      return {
        id: uid,
        name: p.name,
        displayName: p.displayName || p.name,
        nickname: p.nickname,
        profilePicture: p.profilePicture,
        role: String(r.role || GROUP_ROLE_MEMBER),
        joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));
}

export async function getEventGroupMeta(eventId) {
  await ensureEventGroupTables();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT event_id, avatar_url, description, updated_at FROM event_group_meta WHERE event_id = $1 LIMIT 1`,
      String(eventId)
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return {
        eventId: String(rows[0].event_id),
        avatarUrl: rows[0].avatar_url || null,
        description: rows[0].description || '',
        updatedAt: rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : null,
      };
    }
  } catch {}
  return { eventId: String(eventId), avatarUrl: null, description: '', updatedAt: null };
}

export async function upsertEventGroupMeta(eventId, { avatarUrl, description }) {
  await ensureEventGroupTables();
  const safeAvatar = typeof avatarUrl === 'string' ? avatarUrl.trim().slice(0, 1200) : null;
  const safeDesc = typeof description === 'string' ? description.trim().slice(0, 400) : '';
  await prisma.$executeRawUnsafe(
    `INSERT INTO event_group_meta (event_id, avatar_url, description, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (event_id)
     DO UPDATE SET
       avatar_url = COALESCE(EXCLUDED.avatar_url, event_group_meta.avatar_url),
       description = EXCLUDED.description,
       updated_at = CURRENT_TIMESTAMP`,
    String(eventId),
    safeAvatar,
    safeDesc
  );
  return getEventGroupMeta(eventId);
}

/**
 * Assign or revoke COLLABORATOR role.
 * - Maker & Collaborators can assign Collaborator to regular Members.
 * - Maker can never be demoted.
 */
export async function updateGroupMemberRole({ eventId, creatorId, actorId, targetId, role }) {
  const actorRole = await getMemberRoleInEvent(eventId, actorId, creatorId);
  if (actorRole !== GROUP_ROLE_MAKER && actorRole !== GROUP_ROLE_COLLABORATOR) {
    const err = new Error('Only the maker or a collaborator can assign roles.');
    err.status = 403;
    throw err;
  }
  if (String(targetId) === String(creatorId)) {
    const err = new Error('The event maker role cannot be modified.');
    err.status = 403;
    throw err;
  }
  const normalizedRole = role === GROUP_ROLE_COLLABORATOR ? GROUP_ROLE_COLLABORATOR : GROUP_ROLE_MEMBER;
  const existingTargetRole = await getMemberRoleInEvent(eventId, targetId, creatorId);
  if (!existingTargetRole) {
    const err = new Error('Target user is not a member of this group.');
    err.status = 404;
    throw err;
  }
  // Only Maker can demote an existing Collaborator; Collaborators can promote Members to Collaborator
  if (existingTargetRole === GROUP_ROLE_COLLABORATOR && normalizedRole === GROUP_ROLE_MEMBER && actorRole !== GROUP_ROLE_MAKER) {
    const err = new Error('Only the maker can revoke collaborator permissions.');
    err.status = 403;
    throw err;
  }

  await prisma.$executeRawUnsafe(
    `UPDATE event_group_members SET role = $3 WHERE event_id = $1 AND user_id = $2`,
    String(eventId),
    String(targetId),
    normalizedRole
  );

  // Sync Redis media-upload collaborator set
  if (normalizedRole === GROUP_ROLE_COLLABORATOR) {
    await redis.sadd(acceptedCollabKey(eventId), String(targetId)).catch(() => {});
  } else {
    await redis.srem(acceptedCollabKey(eventId), String(targetId)).catch(() => {});
  }
  await redis.del('cache:mini_events:active_list:v1').catch(() => {});
  return { ok: true, targetId: String(targetId), role: normalizedRole };
}

/**
 * Kick / Erase member from Event GroupChat AND abruptly purge their Event participation.
 * STRICT LAW: NOBODY can ever kick/erase the Maker (HTTP 403).
 */
export async function kickGroupMemberAndPurgeParticipation({ eventId, creatorId, actorId, targetId }) {
  const actorRole = await getMemberRoleInEvent(eventId, actorId, creatorId);
  if (actorRole !== GROUP_ROLE_MAKER && actorRole !== GROUP_ROLE_COLLABORATOR) {
    const err = new Error('Only the maker or a collaborator can remove members.');
    err.status = 403;
    throw err;
  }
  if (String(targetId) === String(creatorId)) {
    const err = new Error('The event maker cannot be removed from the group.');
    err.status = 403;
    throw err;
  }

  await ensureEventGroupTables();
  const eid = String(eventId);
  const tid = String(targetId);

  await Promise.allSettled([
    prisma.$executeRawUnsafe(`DELETE FROM event_group_members WHERE event_id = $1 AND user_id = $2`, eid, tid),
    prisma.$executeRawUnsafe(`DELETE FROM event_group_reads WHERE event_id = $1 AND user_id = $2`, eid, tid),
    redis.srem(acceptedCollabKey(eid), tid),
    redis.del(userRequestKey(tid)),
    redis.del('cache:mini_events:active_list:v1'),
  ]);

  // Also purge any pending request from targetId on this event
  try {
    const rawReqs = await redis.get(collabRequestsKey(eid));
    if (rawReqs) {
      const parsed = JSON.parse(rawReqs);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((r) => String(r?.userId) !== tid);
        if (filtered.length === 0) await redis.del(collabRequestsKey(eid));
        else await redis.set(collabRequestsKey(eid), JSON.stringify(filtered));
      }
    }
  } catch {}

  // Remove target from any active group call
  await leaveEventGroupCall(eid, tid).catch(() => {});
  return { ok: true, kickedUserId: tid };
}

export async function listGroupMessages({ eventId, userId, sinceTs = 0, limit = 60 }) {
  await ensureEventGroupTables();
  const readRows = await prisma.$queryRawUnsafe(
    `SELECT cleared_at_ms FROM event_group_reads WHERE event_id = $1 AND user_id = $2 LIMIT 1`,
    String(eventId),
    String(userId)
  );
  const clearedAtMs = Number(readRows?.[0]?.cleared_at_ms || 0);
  const effectiveFloor = Math.max(Number(sinceTs || 0), clearedAtMs);

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, event_id, sender_id, sender_name, sender_avatar, msg_type, payload_json, ts
     FROM event_group_messages
     WHERE event_id = $1 AND ts > $2
     ORDER BY ts DESC
     LIMIT $3`,
    String(eventId),
    effectiveFloor,
    Math.min(100, Math.max(1, Number(limit) || 60))
  );

  return (rows || [])
    .reverse()
    .map((r) => {
      let payload = {};
      try {
        payload = JSON.parse(r.payload_json || '{}');
      } catch {}
      return {
        id: String(r.id),
        eventId: String(r.event_id),
        senderId: String(r.sender_id),
        senderName: r.sender_name || 'Kalcerian',
        senderAvatar: r.sender_avatar || null,
        type: r.msg_type || 'text',
        ...payload,
        ts: Number(r.ts),
      };
    });
}

export async function appendGroupMessage({ eventId, senderId, senderName, senderAvatar, msgType = 'text', payload = {}, id = null, ts = null }) {
  await ensureEventGroupTables();
  const msgId = (typeof id === 'string' && id.trim()) ? id.trim().slice(0, 128) : `gmsg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const msgTs = Number(ts) > 0 ? Math.floor(Number(ts)) : Date.now();
  const safePayload = JSON.stringify(payload || {}).slice(0, 32000);

  await prisma.$executeRawUnsafe(
    `INSERT INTO event_group_messages (id, event_id, sender_id, sender_name, sender_avatar, msg_type, payload_json, ts)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET payload_json = EXCLUDED.payload_json, msg_type = EXCLUDED.msg_type`,
    msgId,
    String(eventId),
    String(senderId),
    String(senderName || 'Kalcerian').slice(0, 160),
    senderAvatar ? String(senderAvatar).slice(0, 1200) : null,
    String(msgType || 'text').slice(0, 32),
    safePayload,
    msgTs
  );

  await markGroupChatRead(eventId, senderId, msgTs);
  return {
    id: msgId,
    eventId: String(eventId),
    senderId: String(senderId),
    senderName: String(senderName || 'Kalcerian'),
    senderAvatar: senderAvatar || null,
    type: String(msgType || 'text'),
    ...(payload || {}),
    ts: msgTs,
  };
}

export async function markGroupChatRead(eventId, userId, readTs = Date.now()) {
  await ensureEventGroupTables();
  const ts = Math.max(1, Math.floor(Number(readTs) || Date.now()));
  await prisma.$executeRawUnsafe(
    `INSERT INTO event_group_reads (event_id, user_id, last_read_ts, cleared_at_ms)
     VALUES ($1, $2, $3, 0)
     ON CONFLICT (event_id, user_id)
     DO UPDATE SET last_read_ts = GREATEST(event_group_reads.last_read_ts, EXCLUDED.last_read_ts)`,
    String(eventId),
    String(userId),
    ts
  );
  return ts;
}

export async function clearGroupChatForMe(eventId, userId, clearedAtMs = Date.now()) {
  await ensureEventGroupTables();
  const ts = Math.max(1, Math.floor(Number(clearedAtMs) || Date.now()));
  await prisma.$executeRawUnsafe(
    `INSERT INTO event_group_reads (event_id, user_id, last_read_ts, cleared_at_ms)
     VALUES ($1, $2, $3, $3)
     ON CONFLICT (event_id, user_id)
     DO UPDATE SET
       last_read_ts = GREATEST(event_group_reads.last_read_ts, EXCLUDED.last_read_ts),
       cleared_at_ms = GREATEST(event_group_reads.cleared_at_ms, EXCLUDED.cleared_at_ms)`,
    String(eventId),
    String(userId),
    ts
  );
  return ts;
}

export async function deleteSelectedGroupMessages({ eventId, actorId, actorRole, messageIds = [] }) {
  await ensureEventGroupTables();
  const safeIds = (Array.isArray(messageIds) ? messageIds : []).map(String).filter(Boolean).slice(0, 50);
  if (safeIds.length === 0) return { deleted: 0 };
  const canModerate = actorRole === GROUP_ROLE_MAKER || actorRole === GROUP_ROLE_COLLABORATOR;
  let deleted = 0;
  for (const mid of safeIds) {
    if (canModerate) {
      await prisma.$executeRawUnsafe(`DELETE FROM event_group_messages WHERE event_id = $1 AND id = $2`, String(eventId), mid);
      deleted += 1;
    } else {
      await prisma.$executeRawUnsafe(
        `DELETE FROM event_group_messages WHERE event_id = $1 AND id = $2 AND sender_id = $3`,
        String(eventId),
        mid,
        String(actorId)
      );
      deleted += 1;
    }
  }
  return { deleted };
}

export async function isUserInAnotherCall(userId, excludeCallId = null) {
  if (!userId) return false;
  const uid = String(userId);
  try {
    const redisLock = await redis.get(`call:lock:${uid}`).catch(() => null);
    if (redisLock) {
      const parsed = JSON.parse(redisLock);
      if (!excludeCallId || parsed?.callId !== excludeCallId) return true;
    }
  } catch {}
  const canLock = await getCanonicalCallLock(uid).catch(() => null);
  if (canLock && (!excludeCallId || canLock.callId !== excludeCallId)) return true;
  return false;
}

export async function getActiveEventGroupCall(eventId) {
  await ensureEventGroupTables();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT event_id, call_id, call_mode, initiator_id, initiator_name, participant_ids_json, started_at, active
       FROM event_group_calls
       WHERE event_id = $1 AND active = TRUE
       LIMIT 1`,
      String(eventId)
    );
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const r = rows[0];
    let participants = [];
    try {
      participants = JSON.parse(r.participant_ids_json || '[]');
    } catch {}
    return {
      eventId: String(r.event_id),
      callId: String(r.call_id),
      mode: r.call_mode === 'video' ? 'video' : 'voice',
      initiatorId: String(r.initiator_id),
      initiatorName: r.initiator_name || 'Kalcerian',
      participantIds: Array.isArray(participants) ? participants.map(String) : [],
      startedAt: Number(r.started_at || Date.now()),
      active: true,
    };
  } catch {
    return null;
  }
}

export async function startOrJoinEventGroupCall({ eventId, userId, userName, mode = 'voice' }) {
  await ensureEventGroupTables();
  const eid = String(eventId);
  const uid = String(userId);
  const existing = await getActiveEventGroupCall(eid);
  const callId = existing?.callId || `gcall_${eid.slice(0, 12)}_${Date.now()}`;

  // Shared Unified Call Queue check: reject if caller is already in a DIFFERENT active personal/group call
  if (await isUserInAnotherCall(uid, callId)) {
    return { ok: false, busy: true, reason: 'in_another_call', error: 'You are currently in another call.' };
  }

  const nextParticipants = Array.from(new Set([...(existing?.participantIds || []), uid]));
  const nextMode = existing ? (mode === 'video' ? 'video' : existing.mode) : (mode === 'video' ? 'video' : 'voice');
  const startedAt = existing?.startedAt || Date.now();

  await prisma.$executeRawUnsafe(
    `INSERT INTO event_group_calls (event_id, call_id, call_mode, initiator_id, initiator_name, participant_ids_json, started_at, updated_at, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, TRUE)
     ON CONFLICT (event_id)
     DO UPDATE SET
       call_id = EXCLUDED.call_id,
       call_mode = EXCLUDED.call_mode,
       participant_ids_json = EXCLUDED.participant_ids_json,
       updated_at = CURRENT_TIMESTAMP,
       active = TRUE`,
    eid,
    callId,
    nextMode,
    existing?.initiatorId || uid,
    existing?.initiatorName || String(userName || 'Kalcerian').slice(0, 160),
    JSON.stringify(nextParticipants),
    startedAt
  );

  // Acquire shared canonical & Redis call lock so 1-on-1 callers see "In Another Call"!
  const lockPayload = JSON.stringify({
    callId,
    callerId: uid,
    calleeId: `group:${eid}`,
    mode: nextMode,
    ts: Date.now(),
  });
  await Promise.allSettled([
    redis.set(`call:lock:${uid}`, lockPayload, 'EX', CALL_LOCK_TTL_SECONDS),
    acquireCanonicalCallLock({ userId: uid, callId, callerId: uid, calleeId: `group:${eid}`, mode: nextMode }),
  ]);

  // Identify other members currently busy in another call
  const memberIds = await getEventGroupMemberIds(eid);
  const busyMemberIds = [];
  for (const mid of memberIds) {
    if (mid === uid) continue;
    if (await isUserInAnotherCall(mid, callId)) {
      busyMemberIds.push(mid);
    }
  }

  return {
    ok: true,
    call: {
      eventId: eid,
      callId,
      mode: nextMode,
      initiatorId: existing?.initiatorId || uid,
      initiatorName: existing?.initiatorName || String(userName || 'Kalcerian'),
      participantIds: nextParticipants,
      startedAt,
      active: true,
    },
    busyMemberIds,
  };
}

export async function leaveEventGroupCall(eventId, userId, userName = 'Kalcerian') {
  await ensureEventGroupTables();
  const eid = String(eventId);
  const uid = String(userId);
  const existing = await getActiveEventGroupCall(eid);

  await Promise.allSettled([
    redis.del(`call:lock:${uid}`),
    releaseCanonicalCallLock(uid),
  ]);

  if (!existing) return { ok: true, ended: true };
  const remaining = existing.participantIds.filter((id) => id !== uid);

  if (remaining.length === 0) {
    const durationSeconds = Math.max(0, Math.round((Date.now() - Number(existing.startedAt || Date.now())) / 1000));
    await prisma.$executeRawUnsafe(
      `UPDATE event_group_calls SET active = FALSE, participant_ids_json = '[]', updated_at = CURRENT_TIMESTAMP WHERE event_id = $1`,
      eid
    );
    await appendGroupMessage({
      eventId: eid,
      senderId: uid,
      senderName: userName,
      msgType: 'call',
      id: `gcalllog_${existing.callId}`,
      payload: {
        callId: existing.callId,
        callMode: existing.mode,
        durationSeconds,
        text: existing.mode === 'video' ? 'Group video call ended' : 'Group voice call ended',
      },
    }).catch(() => {});
    return { ok: true, ended: true, durationSeconds };
  }

  await prisma.$executeRawUnsafe(
    `UPDATE event_group_calls SET participant_ids_json = $2, updated_at = CURRENT_TIMESTAMP WHERE event_id = $1`,
    eid,
    JSON.stringify(remaining)
  );
  return { ok: true, ended: false, participantIds: remaining };
}

export async function getUserGroupChatsSummary(userId, activeEvents = []) {
  await ensureEventGroupTables();
  const uid = String(userId);
  const summaries = {};

  for (const ev of activeEvents || []) {
    const eid = String(ev.id);
    const isCreator = String(ev.creatorId || ev.creator?.id || '') === uid;
    if (isCreator) await ensureMakerInGroup(eid, uid);

    const role = await getMemberRoleInEvent(eid, uid, ev.creatorId || ev.creator?.id);
    if (!role) continue;

    const [meta, members, readRows, latestMsgs, activeCall] = await Promise.all([
      getEventGroupMeta(eid),
      listEnrichedGroupMembers(eid, ev.creatorId || ev.creator?.id),
      prisma.$queryRawUnsafe(
        `SELECT last_read_ts, cleared_at_ms FROM event_group_reads WHERE event_id = $1 AND user_id = $2 LIMIT 1`,
        eid,
        uid
      ),
      prisma.$queryRawUnsafe(
        `SELECT id, sender_id, sender_name, msg_type, payload_json, ts FROM event_group_messages WHERE event_id = $1 ORDER BY ts DESC LIMIT 1`,
        eid
      ),
      getActiveEventGroupCall(eid),
    ]);

    const lastReadTs = Number(readRows?.[0]?.last_read_ts || 0);
    const clearedAtMs = Number(readRows?.[0]?.cleared_at_ms || 0);
    const unreadRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS cnt FROM event_group_messages WHERE event_id = $1 AND sender_id <> $2 AND ts > $3`,
      eid,
      uid,
      Math.max(lastReadTs, clearedAtMs)
    );
    const unreadCount = Number(unreadRows?.[0]?.cnt || 0);

    let lastMessage = null;
    const latest = latestMsgs?.[0];
    if (latest && Number(latest.ts) > clearedAtMs) {
      let payload = {};
      try {
        payload = JSON.parse(latest.payload_json || '{}');
      } catch {}
      lastMessage = {
        id: String(latest.id),
        senderId: String(latest.sender_id),
        senderName: latest.sender_name || 'Kalcerian',
        type: latest.msg_type || 'text',
        text: payload.text || payload.message || '',
        callMode: payload.callMode || null,
        replyTo: payload.replyTo || null,
        ts: Number(latest.ts),
      };
    }

    summaries[eid] = {
      eventId: eid,
      title: ev.title,
      role,
      avatarUrl: meta.avatarUrl,
      description: meta.description,
      members,
      memberCount: members.length,
      unreadCount,
      lastMessage,
      activeCall,
    };
  }

  return summaries;
}

