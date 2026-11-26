import prisma from '../lib/prisma.js';

export const FRIEND_REQUEST_TTL_MS = 24 * 60 * 60 * 1000; // 1 day (24 hours)

let friendsTablesChecked = false;

export async function ensureFriendsTables() {
  if (friendsTablesChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_friends (
        user_id VARCHAR(128) NOT NULL,
        friend_id VARCHAR(128) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, friend_id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        sender_id VARCHAR(128) NOT NULL,
        receiver_id VARCHAR(128) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY (sender_id, receiver_id)
      )
    `);
    friendsTablesChecked = true;
  } catch (err) {
    console.warn('[FriendsStore] ensureFriendsTables error:', err?.message);
  }
}

export async function pruneExpiredFriendRequests() {
  await ensureFriendsTables();
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM friend_requests WHERE expires_at <= CURRENT_TIMESTAMP`
    );
  } catch (err) {
    console.warn('[FriendsStore] pruneExpiredFriendRequests error:', err?.message);
  }
}

export async function getFriendRelations(userId) {
  if (!userId) {
    return {
      friendIds: [],
      outgoingRequestIds: [],
      incomingRequestIds: [],
      outgoingMeta: {},
      incomingMeta: {},
    };
  }
  await pruneExpiredFriendRequests();
  const uid = String(userId);
  try {
    const [friendRows, outgoingRows, incomingRows] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT friend_id FROM user_friends WHERE user_id = $1`,
        uid
      ),
      prisma.$queryRawUnsafe(
        `SELECT receiver_id, expires_at FROM friend_requests WHERE sender_id = $1 AND expires_at > CURRENT_TIMESTAMP`,
        uid
      ),
      prisma.$queryRawUnsafe(
        `SELECT sender_id, expires_at FROM friend_requests WHERE receiver_id = $1 AND expires_at > CURRENT_TIMESTAMP`,
        uid
      ),
    ]);

    const friendIds = (friendRows || []).map((r) => String(r.friend_id));
    const outgoingRequestIds = [];
    const outgoingMeta = {};
    for (const r of outgoingRows || []) {
      const id = String(r.receiver_id);
      outgoingRequestIds.push(id);
      outgoingMeta[id] = r.expires_at ? new Date(r.expires_at).toISOString() : null;
    }

    const incomingRequestIds = [];
    const incomingMeta = {};
    for (const r of incomingRows || []) {
      const id = String(r.sender_id);
      incomingRequestIds.push(id);
      incomingMeta[id] = r.expires_at ? new Date(r.expires_at).toISOString() : null;
    }

    return {
      friendIds,
      outgoingRequestIds,
      incomingRequestIds,
      outgoingMeta,
      incomingMeta,
    };
  } catch (err) {
    console.warn('[FriendsStore] getFriendRelations error:', err?.message);
    return {
      friendIds: [],
      outgoingRequestIds: [],
      incomingRequestIds: [],
      outgoingMeta: {},
      incomingMeta: {},
    };
  }
}

export async function areUsersFriends(userA, userB) {
  if (!userA || !userB) return false;
  const a = String(userA);
  const b = String(userB);
  if (a === b) return true;
  await ensureFriendsTables();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT 1 AS ok FROM user_friends WHERE user_id = $1 AND friend_id = $2 LIMIT 1`,
      a,
      b
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    console.warn('[FriendsStore] areUsersFriends error:', err?.message);
    return false;
  }
}

export async function createMutualFriendship(userA, userB) {
  const a = String(userA);
  const b = String(userB);
  if (!a || !b || a === b) return false;
  await ensureFriendsTables();
  await prisma.$executeRawUnsafe(
    `DELETE FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
    a,
    b
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO user_friends (user_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT (user_id, friend_id) DO NOTHING`,
    a,
    b
  );
  return true;
}

export async function sendFriendRequest(senderId, receiverId) {
  const s = String(senderId);
  const r = String(receiverId);
  if (!s || !r || s === r) {
    return { ok: false, status: 'invalid' };
  }
  await pruneExpiredFriendRequests();

  if (await areUsersFriends(s, r)) {
    return { ok: true, status: 'already_friends' };
  }

  // If the target already sent an unexpired friend request to sender, auto-accept into mutual friendship
  const reciprocal = await prisma.$queryRawUnsafe(
    `SELECT 1 AS ok FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
    r,
    s
  );
  if (Array.isArray(reciprocal) && reciprocal.length > 0) {
    await createMutualFriendship(s, r);
    return { ok: true, status: 'accepted' };
  }

  const expiresAt = new Date(Date.now() + FRIEND_REQUEST_TTL_MS);
  await prisma.$executeRawUnsafe(
    `INSERT INTO friend_requests (sender_id, receiver_id, created_at, expires_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
     ON CONFLICT (sender_id, receiver_id)
     DO UPDATE SET created_at = CURRENT_TIMESTAMP, expires_at = EXCLUDED.expires_at`,
    s,
    r,
    expiresAt
  );
  return { ok: true, status: 'pending', expiresAt: expiresAt.toISOString() };
}

export async function cancelFriendRequest(senderId, receiverId) {
  const s = String(senderId);
  const r = String(receiverId);
  if (!s || !r) return { ok: false };
  await ensureFriendsTables();
  await prisma.$executeRawUnsafe(
    `DELETE FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2`,
    s,
    r
  );
  return { ok: true, status: 'cancelled' };
}

export async function acceptFriendRequest(receiverId, senderId) {
  const r = String(receiverId);
  const s = String(senderId);
  if (!r || !s || r === s) return { ok: false, status: 'invalid' };
  await pruneExpiredFriendRequests();

  if (await areUsersFriends(r, s)) {
    return { ok: true, status: 'already_friends' };
  }

  const pending = await prisma.$queryRawUnsafe(
    `SELECT 1 AS ok FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
    s,
    r
  );
  if (!Array.isArray(pending) || pending.length === 0) {
    return { ok: false, status: 'expired_or_missing' };
  }

  await createMutualFriendship(r, s);
  return { ok: true, status: 'accepted' };
}

export async function rejectFriendRequest(receiverId, senderId) {
  const r = String(receiverId);
  const s = String(senderId);
  if (!r || !s) return { ok: false };
  await ensureFriendsTables();
  await prisma.$executeRawUnsafe(
    `DELETE FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2`,
    s,
    r
  );
  return { ok: true, status: 'rejected' };
}

export async function purgeUserFriendRecords(userId) {
  if (!userId) return;
  const uid = String(userId);
  await ensureFriendsTables();
  await Promise.allSettled([
    prisma.$executeRawUnsafe(`DELETE FROM user_friends WHERE user_id = $1 OR friend_id = $1`, uid),
    prisma.$executeRawUnsafe(`DELETE FROM friend_requests WHERE sender_id = $1 OR receiver_id = $1`, uid),
  ]);
}
