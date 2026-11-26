import prisma from '../lib/prisma.js';
import { ensurePersistentUserProfilesBatch, CANONICAL_USER_SELECT } from '../utils/profileDefaults.js';
import { getMemberRoleInEvent, appendGroupMessage } from './eventGroupStore.js';
import { computeBlendRoute, normalizeBlendMode } from './blendRoutingService.js';

async function verifyEventGroupMembership(eventId, userId) {
  if (!eventId || !userId) return { allowed: false, role: null, event: null };
  const ev = await prisma.miniEvent.findUnique({
    where: { id: String(eventId) },
    select: { id: true, creatorId: true, title: true, lat: true, lng: true, isActive: true },
  });
  if (!ev) return { allowed: false, role: null, event: null };
  const role = await getMemberRoleInEvent(ev.id, userId, ev.creatorId);
  return { allowed: Boolean(role), role, event: ev };
}

let blendTablesChecked = false;

const PARTICIPANT_PALETTE = [
  '#ff006e', // Kalceria Neon Magenta
  '#00d4ff', // Tactical Cyan
  '#ffd60a', // Kalceria Golden Yellow
  '#22c55e', // Emerald Green
  '#a855f7', // Electric Violet
  '#fb923c', // Sunset Orange
];

export async function ensureBlendTables() {
  if (blendTablesChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS event_group_blends (
        event_id VARCHAR(128) PRIMARY KEY,
        created_by VARCHAR(128) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS event_group_blend_members (
        event_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'joined',
        transport_mode VARCHAR(16) NOT NULL DEFAULT 'foot',
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        accuracy DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        speed DOUBLE PRECISION,
        is_stationary BOOLEAN NOT NULL DEFAULT TRUE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (event_id, user_id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_blend_members_user_status
      ON event_group_blend_members (user_id, status)
    `);
    blendTablesChecked = true;
  } catch (err) {
    console.warn('[GroupBlendStore] ensureBlendTables warning:', err?.message);
  }
}

function parseFinite(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function inviteGroupBlend({ eventId, userId, initialPos = null }) {
  await ensureBlendTables();
  const membership = await verifyEventGroupMembership(eventId, userId);
  if (!membership?.allowed) return { forbidden: true };

  const eid = String(eventId);
  const uid = String(userId);

  const existing = await prisma.$queryRawUnsafe(
    `SELECT event_id, is_active FROM event_group_blends WHERE event_id = $1 LIMIT 1`,
    eid
  );
  const wasActive = Boolean(existing?.[0]?.is_active);

  await prisma.$executeRawUnsafe(
    `INSERT INTO event_group_blends (event_id, created_by, is_active, updated_at)
     VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (event_id)
     DO UPDATE SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
    eid,
    uid
  );

  // Initiator auto-joins Blend (default mode: foot!)
  await joinGroupBlend({
    eventId: eid,
    userId: uid,
    transportMode: 'foot',
    position: initialPos,
    announceInChat: false,
  });

  if (!wasActive) {
    const initiator = await prisma.user.findUnique({
      where: { id: uid },
      select: { name: true, nickname: true, profilePicture: true },
    });
    const senderName = initiator?.name || initiator?.nickname || 'Kalcerian';
    await appendGroupMessage({
      eventId: eid,
      senderId: uid,
      senderName,
      senderAvatar: initiator?.profilePicture || null,
      msgType: 'blend_invite',
      payload: {
        text: `${senderName} memulai Location Blend! Tap "Join Blend" untuk navigasi bareng ke lokasi event.`,
      },
    }).catch(() => {});
  }

  return await getGroupBlendState({ eventId: eid, viewerId: uid });
}

export async function joinGroupBlend({
  eventId,
  userId,
  transportMode = 'foot',
  position = null,
  announceInChat = true,
}) {
  await ensureBlendTables();
  const membership = await verifyEventGroupMembership(eventId, userId);
  if (!membership?.allowed) return { forbidden: true };

  const eid = String(eventId);
  const uid = String(userId);
  const safeMode = normalizeBlendMode(transportMode);

  const lat = parseFinite(position?.lat);
  const lng = parseFinite(position?.lng);
  const accuracy = parseFinite(position?.accuracy);
  const heading = parseFinite(position?.heading);
  const speed = parseFinite(position?.speed);
  const isStationary = position?.isStationary !== undefined ? Boolean(position.isStationary) : true;

  await prisma.$executeRawUnsafe(
    `INSERT INTO event_group_blends (event_id, created_by, is_active, updated_at)
     VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (event_id)
     DO UPDATE SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
    eid,
    uid
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO event_group_blend_members
      (event_id, user_id, status, transport_mode, lat, lng, accuracy, heading, speed, is_stationary, joined_at, updated_at)
     VALUES ($1, $2, 'joined', $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (event_id, user_id)
     DO UPDATE SET
       status = 'joined',
       transport_mode = COALESCE(EXCLUDED.transport_mode, event_group_blend_members.transport_mode),
       lat = COALESCE(EXCLUDED.lat, event_group_blend_members.lat),
       lng = COALESCE(EXCLUDED.lng, event_group_blend_members.lng),
       accuracy = COALESCE(EXCLUDED.accuracy, event_group_blend_members.accuracy),
       heading = COALESCE(EXCLUDED.heading, event_group_blend_members.heading),
       speed = COALESCE(EXCLUDED.speed, event_group_blend_members.speed),
       is_stationary = EXCLUDED.is_stationary,
       updated_at = CURRENT_TIMESTAMP`,
    eid,
    uid,
    safeMode,
    lat,
    lng,
    accuracy,
    heading,
    speed,
    isStationary
  );

  if (announceInChat) {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { name: true, nickname: true, profilePicture: true },
    });
    const senderName = user?.name || user?.nickname || 'Kalcerian';
    await appendGroupMessage({
      eventId: eid,
      senderId: uid,
      senderName,
      senderAvatar: user?.profilePicture || null,
      msgType: 'blend_join',
      payload: {
        text: `${senderName} bergabung ke Location Blend!`,
      },
    }).catch(() => {});
  }

  return await getGroupBlendState({ eventId: eid, viewerId: uid });
}

export async function leaveGroupBlend({ eventId, userId }) {
  await ensureBlendTables();
  const eid = String(eventId);
  const uid = String(userId);

  await prisma.$executeRawUnsafe(
    `UPDATE event_group_blend_members
     SET status = 'left', updated_at = CURRENT_TIMESTAMP
     WHERE event_id = $1 AND user_id = $2`,
    eid,
    uid
  );

  const remaining = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS cnt FROM event_group_blend_members WHERE event_id = $1 AND status = 'joined'`,
    eid
  );
  if (Number(remaining?.[0]?.cnt || 0) === 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE event_group_blends SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE event_id = $1`,
      eid
    );
  }

  return { ok: true, eventId: eid, isJoined: false };
}

export async function updateGroupBlendMemberState({
  eventId,
  userId,
  transportMode,
  lat,
  lng,
  accuracy,
  heading,
  speed,
  isStationary,
}) {
  await ensureBlendTables();
  const membership = await verifyEventGroupMembership(eventId, userId);
  if (!membership?.allowed) return { forbidden: true };

  const eid = String(eventId);
  const uid = String(userId);

  const existing = await prisma.$queryRawUnsafe(
    `SELECT status, transport_mode, lat, lng, accuracy, heading, speed, is_stationary
     FROM event_group_blend_members
     WHERE event_id = $1 AND user_id = $2 LIMIT 1`,
    eid,
    uid
  );
  if (!existing?.[0] || existing[0].status !== 'joined') {
    return { notJoined: true };
  }

  const cur = existing[0];
  const nextMode = transportMode !== undefined ? normalizeBlendMode(transportMode) : cur.transport_mode;
  const pLat = parseFinite(lat);
  const pLng = parseFinite(lng);
  const nextLat = pLat !== null && pLat >= -90 && pLat <= 90 ? pLat : cur.lat;
  const nextLng = pLng !== null && pLng >= -180 && pLng <= 180 ? pLng : cur.lng;
  const nextAcc = parseFinite(accuracy) ?? cur.accuracy;
  const nextHeading = parseFinite(heading) ?? cur.heading;
  const nextSpeed = parseFinite(speed) ?? cur.speed;
  const nextStationary = typeof isStationary === 'boolean' ? isStationary : Boolean(cur.is_stationary);

  await prisma.$executeRawUnsafe(
    `UPDATE event_group_blend_members
     SET transport_mode = $1, lat = $2, lng = $3, accuracy = $4, heading = $5, speed = $6, is_stationary = $7, updated_at = CURRENT_TIMESTAMP
     WHERE event_id = $8 AND user_id = $9`,
    nextMode,
    nextLat,
    nextLng,
    nextAcc,
    nextHeading,
    nextSpeed,
    nextStationary,
    eid,
    uid
  );

  return await getGroupBlendState({ eventId: eid, viewerId: uid });
}

export async function getGroupBlendState({ eventId, viewerId, includeRoutes = true }) {
  await ensureBlendTables();
  const eid = String(eventId);
  const vid = String(viewerId);

  // Strict GroupChat membership gate: outsiders NEVER see Blend state!
  const membership = await verifyEventGroupMembership(eid, vid);
  if (!membership?.allowed) return { forbidden: true };

  const [blendRows, memberRows, eventRow] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT event_id, created_by, is_active, created_at FROM event_group_blends WHERE event_id = $1 LIMIT 1`,
      eid
    ),
    prisma.$queryRawUnsafe(
      `SELECT user_id, status, transport_mode, lat, lng, accuracy, heading, speed, is_stationary, joined_at, updated_at
       FROM event_group_blend_members
       WHERE event_id = $1 AND status = 'joined'
       ORDER BY joined_at ASC`,
      eid
    ),
    prisma.miniEvent.findUnique({
      where: { id: eid },
      select: { id: true, title: true, lat: true, lng: true, isActive: true },
    }),
  ]);

  const blend = blendRows?.[0] || null;
  const joinedMembers = Array.isArray(memberRows) ? memberRows : [];
  const isActive = Boolean(blend?.is_active && joinedMembers.length > 0 && eventRow?.isActive !== false);
  const myEntry = joinedMembers.find((m) => String(m.user_id) === vid) || null;
  const isJoined = Boolean(isActive && myEntry);

  // STRICT OPT-IN POV PRIVACY: Group members who have NOT accepted Blend invitation
  // receive ONLY the invite metadata — ZERO live routes, coords, or ETAs!
  if (!isActive || !isJoined) {
    return {
      ok: true,
      eventId: eid,
      hasActiveBlend: isActive,
      isJoined: false,
      joinedCount: joinedMembers.length,
      participants: [],
      destination: null,
    };
  }

  const destLat = Number(eventRow?.lat);
  const destLng = Number(eventRow?.lng);
  const userIds = joinedMembers.map((m) => String(m.user_id));

  const userRows = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: CANONICAL_USER_SELECT,
  });
  const enrichedUsers = await ensurePersistentUserProfilesBatch(userRows);
  const userMap = new Map(enrichedUsers.map((u) => [String(u.id), u]));

  const participants = await Promise.all(
    joinedMembers.map(async (m, idx) => {
      const uid = String(m.user_id);
      const profile = userMap.get(uid) || { id: uid, name: 'Kalcerian', displayName: 'Kalcerian' };
      const pLat = parseFinite(m.lat) ?? parseFinite(profile.domicileLat);
      const pLng = parseFinite(m.lng) ?? parseFinite(profile.domicileLng);
      const mode = normalizeBlendMode(m.transport_mode);

      let route = null;
      if (includeRoutes && pLat !== null && pLng !== null && Number.isFinite(destLat) && Number.isFinite(destLng)) {
        route = await computeBlendRoute({
          fromLat: pLat,
          fromLng: pLng,
          toLat: destLat,
          toLng: destLng,
          mode,
        });
      }

      return {
        userId: uid,
        isSelf: uid === vid,
        displayName: profile.displayName || profile.name || profile.nickname || 'Kalcerian',
        nickname: profile.nickname || profile.username || '',
        profilePicture: profile.profilePicture || null,
        color: PARTICIPANT_PALETTE[idx % PARTICIPANT_PALETTE.length],
        transportMode: mode,
        lat: pLat,
        lng: pLng,
        accuracy: parseFinite(m.accuracy),
        heading: parseFinite(m.heading) ?? 0,
        speed: parseFinite(m.speed) ?? 0,
        isStationary: Boolean(m.is_stationary),
        updatedAt: m.updated_at ? new Date(m.updated_at).toISOString() : new Date().toISOString(),
        route,
      };
    })
  );

  return {
    ok: true,
    eventId: eid,
    hasActiveBlend: true,
    isJoined: true,
    joinedCount: participants.length,
    myTransportMode: normalizeBlendMode(myEntry.transport_mode),
    destination: {
      eventId: eid,
      title: eventRow?.title || 'Event',
      lat: destLat,
      lng: destLng,
    },
    participants,
  };
}

export async function getMyActiveBlends(viewerId) {
  await ensureBlendTables();
  const vid = String(viewerId);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT b.event_id
     FROM event_group_blend_members m
     JOIN event_group_blends b ON b.event_id = m.event_id
     WHERE m.user_id = $1 AND m.status = 'joined' AND b.is_active = TRUE
     ORDER BY m.updated_at DESC
     LIMIT 3`,
    vid
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return { blends: [] };
  }

  const blends = [];
  for (const r of rows) {
    const state = await getGroupBlendState({ eventId: r.event_id, viewerId: vid, includeRoutes: true });
    if (state?.ok && state.isJoined && state.hasActiveBlend) {
      blends.push(state);
    }
  }
  return { blends };
}

