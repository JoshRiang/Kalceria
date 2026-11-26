/**
 * Isolated In-Memory Prisma + Redis Test Harness for Kalceria Social/Map Controllers.
 *
 * Guarantees:
 * - ZERO real Postgres / Upstash Redis TCP calls (100% offline & deterministic)
 * - ZERO production DB residue (`AGENTS.md` §1.6 compliant)
 * - Exercises REAL Express controllers, stores, SQL state transitions & auth guards
 */

import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';

export function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

export async function invokeController(handler, req) {
  const res = createMockRes();
  let nextErr = null;
  await handler(req, res, (err) => {
    nextErr = err;
  });
  if (nextErr) throw nextErr;
  return res;
}

export function installInMemorySocialHarness({ users = [], miniEvents = [] } = {}) {
  const db = {
    users: new Map(users.map((u) => [String(u.id), { ...u }])),
    miniEvents: new Map(miniEvents.map((e) => [String(e.id), { ...e }])),
    user_friends: new Set(), // "u|f"
    friend_requests: new Map(), // "s|r" -> { sender_id, receiver_id, expires_at }
    personal_chat_clear_cutoffs: new Map(), // "u|conv" -> cleared_at_ms
    event_group_members: new Map(), // "e|u" -> { event_id, user_id, role, joined_at }
    event_group_meta: new Map(), // e -> row
    event_group_messages: new Map(), // id -> row
    event_group_reads: new Map(), // "e|u" -> { event_id, user_id, last_read_ts, cleared_at_ms }
    event_group_calls: new Map(), // e -> row
    reels_media_posts: new Map(), // id -> row
    reels_post_likes: new Set(), // "post|user"
    reels_post_comments: new Map(), // id -> row
    user_event_archives: new Map(), // id -> row
    user_event_archive_media: new Map(), // "arch|url" -> row
    user_archive_settings: new Map(), // user -> boolean
    user_event_archive_deleted: new Set(), // "user|event"
    event_group_blends: new Map(), // e -> row
    event_group_blend_members: new Map(), // "e|u" -> row
    canonical_blocks: new Set(), // "blocker|blocked"
    canonical_call_locks: new Map(), // user -> row
    canonical_call_signals: new Map(), // user -> array
    canonical_presences: new Map(), // user -> row
    canonical_event_notifs: new Map(), // recipient -> array
  };

  const kv = new Map();
  const sets = new Map();
  const lists = new Map();
  const hashes = new Map();

  function getSet(key) {
    if (!sets.has(key)) sets.set(key, new Set());
    return sets.get(key);
  }
  function getList(key) {
    if (!lists.has(key)) lists.set(key, []);
    return lists.get(key);
  }
  function getHash(key) {
    if (!hashes.has(key)) hashes.set(key, {});
    return hashes.get(key);
  }

  // Save originals to restore cleanly on teardown
  const orig = {
    $executeRawUnsafe: prisma.$executeRawUnsafe,
    $queryRawUnsafe: prisma.$queryRawUnsafe,
    userFindUnique: prisma.user.findUnique,
    userFindMany: prisma.user.findMany,
    userUpdate: prisma.user.update,
    miniEventFindUnique: prisma.miniEvent.findUnique,
    miniEventFindFirst: prisma.miniEvent.findFirst,
    miniEventFindMany: prisma.miniEvent.findMany,
    callLockFindUnique: prisma.callLock?.findUnique,
    callLockUpsert: prisma.callLock?.upsert,
    callLockDeleteMany: prisma.callLock?.deleteMany,
    callSigCreate: prisma.callSignal?.create,
    callSigFindMany: prisma.callSignal?.findMany,
    callSigDeleteMany: prisma.callSignal?.deleteMany,
    userPresenceUpsert: prisma.userPresence?.upsert,
    userPresenceFindMany: prisma.userPresence?.findMany,
    userPresenceDeleteMany: prisma.userPresence?.deleteMany,
    eventNotifCreate: prisma.eventNotification?.create,
    eventNotifFindMany: prisma.eventNotification?.findMany,
    eventNotifDeleteMany: prisma.eventNotification?.deleteMany,
    redisMethods: {},
  };

  // In-memory Prisma Model delegates
  prisma.user.findUnique = async ({ where }) => {
    if (where?.id) return db.users.get(String(where.id)) || null;
    if (where?.email) {
      for (const u of db.users.values()) {
        if (String(u.email).toLowerCase() === String(where.email).toLowerCase()) return u;
      }
    }
    return null;
  };
  prisma.user.findMany = async ({ where } = {}) => {
    let list = Array.from(db.users.values());
    if (where?.id?.in) {
      const idSet = new Set(where.id.in.map(String));
      list = list.filter((u) => idSet.has(String(u.id)));
    }
    if (where?.isEmailVerified !== undefined) {
      list = list.filter((u) => Boolean(u.isEmailVerified) === Boolean(where.isEmailVerified));
    }
    if (where?.role) {
      list = list.filter((u) => (u.role || 'USER') === where.role);
    }
    return list.map((u) => ({ ...u }));
  };
  prisma.user.update = async ({ where, data }) => {
    const u = db.users.get(String(where.id));
    if (!u) return null;
    Object.assign(u, data);
    return { ...u };
  };

  prisma.miniEvent.findUnique = async ({ where }) => {
    const ev = db.miniEvents.get(String(where?.id));
    return ev ? { ...ev } : null;
  };
  prisma.miniEvent.findFirst = async ({ where } = {}) => {
    for (const ev of db.miniEvents.values()) {
      if (where?.id && String(ev.id) !== String(where.id)) continue;
      if (where?.isActive !== undefined && Boolean(ev.isActive) !== Boolean(where.isActive)) continue;
      if (where?.expiresAt?.gt && new Date(ev.expiresAt) <= new Date(where.expiresAt.gt)) continue;
      return { ...ev };
    }
    return null;
  };
  prisma.miniEvent.findMany = async ({ where } = {}) => {
    let list = Array.from(db.miniEvents.values());
    if (where?.id?.in) {
      const idSet = new Set(where.id.in.map(String));
      list = list.filter((e) => idSet.has(String(e.id)));
    }
    if (where?.isActive !== undefined) {
      list = list.filter((e) => Boolean(e.isActive) === Boolean(where.isActive));
    }
    if (where?.expiresAt?.gt) {
      const gt = new Date(where.expiresAt.gt);
      list = list.filter((e) => new Date(e.expiresAt) > gt);
    }
    return list.map((e) => ({
      ...e,
      creator: e.creator || db.users.get(String(e.creatorId)) || null,
    }));
  };

  // Patch canonical fallback Prisma delegates (real model names from prisma/schema.prisma)
  if (prisma.callLock) {
    prisma.callLock.findUnique = async ({ where }) => {
      const row = db.canonical_call_locks.get(String(where?.userId));
      if (!row || new Date(row.expiresAt) <= new Date()) return null;
      return { ...row };
    };
    prisma.callLock.upsert = async ({ where, create, update }) => {
      const uid = String(where.userId);
      const next = db.canonical_call_locks.has(uid)
        ? { ...db.canonical_call_locks.get(uid), ...update }
        : { ...create };
      db.canonical_call_locks.set(uid, next);
      return next;
    };
    prisma.callLock.deleteMany = async ({ where } = {}) => {
      if (where?.userId?.in) {
        for (const uid of where.userId.in) db.canonical_call_locks.delete(String(uid));
      } else if (where?.userId) {
        db.canonical_call_locks.delete(String(where.userId));
      } else if (where?.expiresAt?.lte) {
        const lte = new Date(where.expiresAt.lte);
        for (const [k, row] of db.canonical_call_locks.entries()) {
          if (new Date(row.expiresAt) <= lte) db.canonical_call_locks.delete(k);
        }
      }
      return { count: 1 };
    };
  }

  if (prisma.callSignal) {
    prisma.callSignal.create = async ({ data }) => {
      const uid = String(data.toUserId || data.targetId || '');
      if (!db.canonical_call_signals.has(uid)) db.canonical_call_signals.set(uid, []);
      db.canonical_call_signals.get(uid).push({ ...data, createdAt: new Date() });
      return data;
    };
    prisma.callSignal.findMany = async ({ where } = {}) => {
      const uid = String(where?.toUserId || where?.targetId || '');
      let rows = [...(db.canonical_call_signals.get(uid) || [])];
      if (where?.expiresAt?.gt) {
        const gt = new Date(where.expiresAt.gt);
        rows = rows.filter((r) => new Date(r.expiresAt) > gt);
      }
      if (where?.NOT?.callId?.startsWith) {
        const pref = where.NOT.callId.startsWith;
        rows = rows.filter((r) => !String(r.callId || '').startsWith(pref));
      }
      if (where?.callId && typeof where.callId === 'string') {
        rows = rows.filter((r) => String(r.callId) === where.callId);
      }
      if (where?.fromUserId) {
        rows = rows.filter((r) => String(r.fromUserId) === String(where.fromUserId));
      }
      return rows;
    };
    prisma.callSignal.deleteMany = async ({ where } = {}) => {
      if (where?.id?.in) {
        const idSet = new Set(where.id.in.map(String));
        for (const [uid, rows] of db.canonical_call_signals.entries()) {
          db.canonical_call_signals.set(uid, rows.filter((r) => !idSet.has(String(r.id))));
        }
      } else if (where?.toUserId) {
        db.canonical_call_signals.delete(String(where.toUserId));
      } else if (where?.expiresAt?.lte) {
        const lte = new Date(where.expiresAt.lte);
        for (const [uid, rows] of db.canonical_call_signals.entries()) {
          db.canonical_call_signals.set(uid, rows.filter((r) => new Date(r.expiresAt) > lte));
        }
      }
      return { count: 1 };
    };
  }

  if (prisma.userPresence) {
    prisma.userPresence.upsert = async ({ where, create, update }) => {
      const uid = String(where.userId);
      const next = db.canonical_presences.has(uid)
        ? { ...db.canonical_presences.get(uid), ...update }
        : { ...create, updatedAt: new Date() };
      db.canonical_presences.set(uid, next);
      return next;
    };
    prisma.userPresence.findMany = async ({ where } = {}) => {
      let rows = Array.from(db.canonical_presences.values());
      if (where?.updatedAt?.gte) {
        const gte = new Date(where.updatedAt.gte);
        rows = rows.filter((r) => new Date(r.updatedAt) >= gte);
      }
      if (where?.userId?.in) {
        const idSet = new Set(where.userId.in.map(String));
        rows = rows.filter((r) => idSet.has(String(r.userId)));
      }
      return rows;
    };
    prisma.userPresence.deleteMany = async ({ where } = {}) => {
      if (where?.userId) db.canonical_presences.delete(String(where.userId));
      return { count: 1 };
    };
  }

  if (prisma.eventNotification) {
    prisma.eventNotification.create = async ({ data }) => {
      const uid = String(data.recipientId);
      if (!db.canonical_event_notifs.has(uid)) db.canonical_event_notifs.set(uid, []);
      db.canonical_event_notifs.get(uid).push({ ...data, createdAt: new Date() });
      return data;
    };
    prisma.eventNotification.findMany = async ({ where } = {}) => {
      const uid = String(where?.recipientId || '');
      return [...(db.canonical_event_notifs.get(uid) || [])];
    };
    prisma.eventNotification.deleteMany = async ({ where } = {}) => {
      if (where?.recipientId) db.canonical_event_notifs.delete(String(where.recipientId));
      return { count: 1 };
    };
  }

  // Raw SQL emulator for all Kalceria social/group/reels/archive/blend tables
  prisma.$executeRawUnsafe = async (sql, ...args) => {
    const q = String(sql).replace(/\s+/g, ' ').trim();
    if (/^(CREATE TABLE|CREATE INDEX|ALTER TABLE)/i.test(q)) return 0;

    // ── Friends & Requests ──
    if (/DELETE FROM friend_requests WHERE expires_at <= CURRENT_TIMESTAMP/i.test(q)) {
      const now = Date.now();
      for (const [k, row] of db.friend_requests.entries()) {
        if (new Date(row.expires_at).getTime() <= now) db.friend_requests.delete(k);
      }
      return 1;
    }
    if (/DELETE FROM friend_requests WHERE \(sender_id = \$1 AND receiver_id = \$2\) OR/i.test(q)) {
      db.friend_requests.delete(`${args[0]}|${args[1]}`);
      db.friend_requests.delete(`${args[1]}|${args[0]}`);
      return 1;
    }
    if (/DELETE FROM friend_requests WHERE sender_id = \$1 AND receiver_id = \$2/i.test(q)) {
      db.friend_requests.delete(`${args[0]}|${args[1]}`);
      return 1;
    }
    if (/INSERT INTO user_friends/i.test(q)) {
      db.user_friends.add(`${args[0]}|${args[1]}`);
      db.user_friends.add(`${args[1]}|${args[0]}`);
      return 2;
    }
    if (/INSERT INTO friend_requests/i.test(q)) {
      db.friend_requests.set(`${args[0]}|${args[1]}`, {
        sender_id: String(args[0]),
        receiver_id: String(args[1]),
        expires_at: args[2],
      });
      return 1;
    }

    // ── Personal Chat Clear Cutoffs ──
    if (/INSERT INTO personal_chat_clear_cutoffs/i.test(q)) {
      const key = `${args[0]}|${args[1]}`;
      const prev = db.personal_chat_clear_cutoffs.get(key) || 0;
      db.personal_chat_clear_cutoffs.set(key, Math.max(prev, Number(args[2])));
      return 1;
    }

    // ── Event GroupChat ──
    if (/INSERT INTO event_group_members .* 'MAKER'/i.test(q)) {
      const k = `${args[0]}|${args[1]}`;
      const prev = db.event_group_members.get(k);
      db.event_group_members.set(k, {
        event_id: String(args[0]),
        user_id: String(args[1]),
        role: 'MAKER',
        joined_at: prev?.joined_at || new Date(),
      });
      return 1;
    }
    if (/INSERT INTO event_group_members .* 'MEMBER'/i.test(q)) {
      const k = `${args[0]}|${args[1]}`;
      if (!db.event_group_members.has(k)) {
        db.event_group_members.set(k, {
          event_id: String(args[0]),
          user_id: String(args[1]),
          role: 'MEMBER',
          joined_at: new Date(),
        });
      }
      return 1;
    }
    if (/UPDATE event_group_members SET role = \$3 WHERE event_id = \$1 AND user_id = \$2/i.test(q)) {
      const row = db.event_group_members.get(`${args[0]}|${args[1]}`);
      if (row) row.role = String(args[2]);
      return 1;
    }
    if (/DELETE FROM event_group_members WHERE event_id = \$1 AND user_id = \$2/i.test(q)) {
      db.event_group_members.delete(`${args[0]}|${args[1]}`);
      return 1;
    }
    if (/DELETE FROM event_group_reads WHERE event_id = \$1 AND user_id = \$2/i.test(q)) {
      db.event_group_reads.delete(`${args[0]}|${args[1]}`);
      return 1;
    }
    if (/INSERT INTO event_group_meta/i.test(q)) {
      const prev = db.event_group_meta.get(String(args[0])) || {};
      db.event_group_meta.set(String(args[0]), {
        event_id: String(args[0]),
        avatar_url: args[1] ?? prev.avatar_url ?? null,
        cover_url: args[2] ?? prev.cover_url ?? null,
        cover_type: args[2] ? args[3] : prev.cover_type || 'image',
        description: args[4] ?? '',
        updated_at: new Date(),
      });
      return 1;
    }
    if (/INSERT INTO event_group_messages/i.test(q)) {
      db.event_group_messages.set(String(args[0]), {
        id: String(args[0]),
        event_id: String(args[1]),
        sender_id: String(args[2]),
        sender_name: args[3],
        sender_avatar: args[4],
        msg_type: args[5],
        payload_json: args[6],
        ts: Number(args[7]),
      });
      return 1;
    }
    if (/INSERT INTO event_group_reads .* VALUES \(\$1, \$2, \$3, \$3\)/i.test(q)) {
      const k = `${args[0]}|${args[1]}`;
      const prev = db.event_group_reads.get(k) || { last_read_ts: 0, cleared_at_ms: 0 };
      const ts = Number(args[2]);
      db.event_group_reads.set(k, {
        event_id: String(args[0]),
        user_id: String(args[1]),
        last_read_ts: Math.max(prev.last_read_ts, ts),
        cleared_at_ms: Math.max(prev.cleared_at_ms, ts),
      });
      return 1;
    }
    if (/INSERT INTO event_group_reads .* VALUES \(\$1, \$2, \$3, 0\)/i.test(q)) {
      const k = `${args[0]}|${args[1]}`;
      const prev = db.event_group_reads.get(k) || { last_read_ts: 0, cleared_at_ms: 0 };
      const ts = Number(args[2]);
      db.event_group_reads.set(k, {
        event_id: String(args[0]),
        user_id: String(args[1]),
        last_read_ts: Math.max(prev.last_read_ts, ts),
        cleared_at_ms: prev.cleared_at_ms,
      });
      return 1;
    }
    if (/INSERT INTO event_group_calls/i.test(q)) {
      db.event_group_calls.set(String(args[0]), {
        event_id: String(args[0]),
        call_id: String(args[1]),
        call_mode: String(args[2]),
        initiator_id: String(args[3]),
        initiator_name: String(args[4]),
        participant_ids_json: String(args[5]),
        started_at: Number(args[6]),
        active: true,
      });
      return 1;
    }
    if (/UPDATE event_group_calls SET participant_ids_json = \$2, active = \$3/i.test(q)) {
      const row = db.event_group_calls.get(String(args[0]));
      if (row) {
        row.participant_ids_json = String(args[1]);
        row.active = Boolean(args[2]);
      }
      return 1;
    }
    if (/UPDATE event_group_calls SET participant_ids_json = \$2/i.test(q)) {
      const row = db.event_group_calls.get(String(args[0]));
      if (row) row.participant_ids_json = String(args[1]);
      return 1;
    }
    if (/UPDATE event_group_calls SET active = FALSE/i.test(q)) {
      const row = db.event_group_calls.get(String(args[0]));
      if (row) row.active = false;
      return 1;
    }

    // ── Reels Posts, Likes & Comments ──
    if (/INSERT INTO reels_media_posts/i.test(q)) {
      db.reels_media_posts.set(String(args[0]), {
        id: String(args[0]),
        author_id: String(args[1]),
        event_id: args[2],
        category: args[3],
        visibility: args[4],
        media_url: args[5],
        thumbnail_url: args[6],
        media_type: args[7],
        width: args[8],
        height: args[9],
        duration_sec: args[10],
        caption: args[11],
        location: args[12],
        lat: args[13],
        lng: args[14],
        created_at: new Date(),
      });
      return 1;
    }
    if (/INSERT INTO reels_post_likes/i.test(q)) {
      db.reels_post_likes.add(`${args[0]}|${args[1]}`);
      return 1;
    }
    if (/DELETE FROM reels_post_likes WHERE post_id = \$1 AND user_id = \$2/i.test(q)) {
      db.reels_post_likes.delete(`${args[0]}|${args[1]}`);
      return 1;
    }
    if (/DELETE FROM reels_post_likes WHERE post_id = \$1/i.test(q)) {
      for (const k of Array.from(db.reels_post_likes)) {
        if (k.startsWith(`${args[0]}|`)) db.reels_post_likes.delete(k);
      }
      return 1;
    }
    if (/INSERT INTO reels_post_comments/i.test(q)) {
      db.reels_post_comments.set(String(args[0]), {
        id: String(args[0]),
        post_id: String(args[1]),
        author_id: String(args[2]),
        body: String(args[3]),
        created_at: new Date(),
      });
      return 1;
    }
    if (/DELETE FROM reels_post_comments WHERE post_id = \$1/i.test(q)) {
      for (const [k, row] of db.reels_post_comments.entries()) {
        if (row.post_id === String(args[0])) db.reels_post_comments.delete(k);
      }
      return 1;
    }
    if (/DELETE FROM reels_media_posts WHERE id = \$1/i.test(q)) {
      db.reels_media_posts.delete(String(args[0]));
      return 1;
    }

    // ── Event Archives ──
    if (/INSERT INTO user_archive_settings/i.test(q)) {
      db.user_archive_settings.set(String(args[0]), Boolean(args[1]));
      return 1;
    }
    if (/DELETE FROM user_event_archive_deleted WHERE user_id = \$1 AND event_id = \$2/i.test(q)) {
      db.user_event_archive_deleted.delete(`${args[0]}|${args[1]}`);
      return 1;
    }
    if (/INSERT INTO user_event_archive_deleted/i.test(q)) {
      db.user_event_archive_deleted.add(`${args[0]}|${args[1]}`);
      return 1;
    }
    if (/INSERT INTO user_event_archive_media/i.test(q)) {
      const k = `${args[1]}|${args[4]}`;
      if (!db.user_event_archive_media.has(k)) {
        db.user_event_archive_media.set(k, {
          id: String(args[0]),
          archive_id: String(args[1]),
          user_id: String(args[2]),
          event_id: String(args[3]),
          media_url: String(args[4]),
          thumbnail_url: args[5],
          media_type: args[6],
          caption: args[7],
          source: args[8],
          created_at: args[9] ? new Date(args[9]) : new Date(),
        });
      }
      return 1;
    }
    if (/UPDATE user_event_archives SET impression = \$1, is_hidden = \$2/i.test(q)) {
      const row = db.user_event_archives.get(String(args[2]));
      if (row && row.user_id === String(args[3])) {
        row.impression = args[0];
        row.is_hidden = Boolean(args[1]);
        row.updated_at = new Date();
      }
      return 1;
    }
    if (/DELETE FROM user_event_archives WHERE id = \$1 AND user_id = \$2/i.test(q)) {
      const row = db.user_event_archives.get(String(args[0]));
      if (row && row.user_id === String(args[1])) {
        db.user_event_archives.delete(String(args[0]));
        for (const [k, m] of db.user_event_archive_media.entries()) {
          if (m.archive_id === String(args[0])) db.user_event_archive_media.delete(k);
        }
      }
      return 1;
    }

    // ── Canonical User Blocks (raw SQL table `user_blocks`) ──
    if (/INSERT INTO user_blocks/i.test(q)) {
      db.canonical_blocks.add(`${args[0]}|${args[1]}`);
      return 1;
    }
    if (/DELETE FROM user_blocks WHERE blocker_id = \$1 AND blocked_id = \$2/i.test(q)) {
      db.canonical_blocks.delete(`${args[0]}|${args[1]}`);
      return 1;
    }
    if (/DELETE FROM user_blocks WHERE blocker_id = \$1 OR blocked_id = \$1/i.test(q)) {
      const uid = String(args[0]);
      for (const pair of Array.from(db.canonical_blocks)) {
        const [a, b] = pair.split('|');
        if (a === uid || b === uid) db.canonical_blocks.delete(pair);
      }
      return 1;
    }

    // ── Group Location Blend ──
    if (/INSERT INTO event_group_blends/i.test(q)) {
      db.event_group_blends.set(String(args[0]), {
        event_id: String(args[0]),
        created_by: String(args[1]),
        is_active: true,
        created_at: new Date(),
      });
      return 1;
    }
    if (/UPDATE event_group_blends SET is_active = FALSE\b/i.test(q)) {
      const b = db.event_group_blends.get(String(args[0]));
      if (b) b.is_active = false;
      return 1;
    }
    if (/INSERT INTO event_group_blend_members/i.test(q)) {
      const k = `${args[0]}|${args[1]}`;
      const prev = db.event_group_blend_members.get(k) || {};
      db.event_group_blend_members.set(k, {
        event_id: String(args[0]),
        user_id: String(args[1]),
        status: 'joined',
        transport_mode: args[2] ?? prev.transport_mode ?? 'foot',
        lat: args[3] ?? prev.lat ?? null,
        lng: args[4] ?? prev.lng ?? null,
        accuracy: args[5] ?? prev.accuracy ?? null,
        heading: args[6] ?? prev.heading ?? 0,
        speed: args[7] ?? prev.speed ?? 0,
        is_stationary: Boolean(args[8]),
        joined_at: prev.joined_at || new Date(),
        updated_at: new Date(),
      });
      return 1;
    }
    if (/UPDATE event_group_blend_members SET status = 'left'/i.test(q)) {
      const row = db.event_group_blend_members.get(`${args[0]}|${args[1]}`);
      if (row) row.status = 'left';
      return 1;
    }
    if (/UPDATE event_group_blend_members SET transport_mode = \$1/i.test(q)) {
      const row = db.event_group_blend_members.get(`${args[7]}|${args[8]}`);
      if (row) {
        row.transport_mode = args[0];
        row.lat = args[1];
        row.lng = args[2];
        row.accuracy = args[3];
        row.heading = args[4];
        row.speed = args[5];
        row.is_stationary = Boolean(args[6]);
        row.updated_at = new Date();
      }
      return 1;
    }

    return 0;
  };

  prisma.$queryRawUnsafe = async (sql, ...args) => {
    const q = String(sql).replace(/\s+/g, ' ').trim();
    const now = Date.now();

    // ── Canonical User Blocks (raw SQL table `user_blocks`) ──
    if (/SELECT blocked_id FROM user_blocks WHERE blocker_id = \$1/i.test(q)) {
      const out = [];
      for (const pair of db.canonical_blocks) {
        const [blocker, blocked] = pair.split('|');
        if (blocker === String(args[0])) out.push({ blocked_id: blocked });
      }
      return out;
    }
    if (/SELECT blocker_id FROM user_blocks WHERE blocked_id = \$1/i.test(q)) {
      const out = [];
      for (const pair of db.canonical_blocks) {
        const [blocker, blocked] = pair.split('|');
        if (blocked === String(args[0])) out.push({ blocker_id: blocker });
      }
      return out;
    }
    if (/SELECT 1 FROM user_blocks WHERE/i.test(q)) {
      const a = String(args[0]).toLowerCase();
      const b = String(args[1]).toLowerCase();
      for (const pair of db.canonical_blocks) {
        const [blocker, blocked] = pair.split('|');
        if (blocker.toLowerCase() === a && blocked.toLowerCase() === b) return [{ '?column?': 1 }];
      }
      return [];
    }

    // ── Friends & Requests ──
    if (/SELECT friend_id FROM user_friends WHERE user_id = \$1/i.test(q)) {
      const out = [];
      for (const pair of db.user_friends) {
        const [u, f] = pair.split('|');
        if (u === String(args[0])) out.push({ friend_id: f });
      }
      return out;
    }
    if (/SELECT 1 AS ok FROM user_friends WHERE user_id = \$1 AND friend_id = \$2/i.test(q)) {
      return db.user_friends.has(`${args[0]}|${args[1]}`) ? [{ ok: 1 }] : [];
    }
    if (/SELECT receiver_id, expires_at FROM friend_requests WHERE sender_id = \$1/i.test(q)) {
      return Array.from(db.friend_requests.values()).filter(
        (r) => r.sender_id === String(args[0]) && new Date(r.expires_at).getTime() > now
      );
    }
    if (/SELECT sender_id, expires_at FROM friend_requests WHERE receiver_id = \$1/i.test(q)) {
      return Array.from(db.friend_requests.values()).filter(
        (r) => r.receiver_id === String(args[0]) && new Date(r.expires_at).getTime() > now
      );
    }
    if (/SELECT 1 AS ok FROM friend_requests WHERE sender_id = \$1 AND receiver_id = \$2/i.test(q)) {
      const r = db.friend_requests.get(`${args[0]}|${args[1]}`);
      return r && new Date(r.expires_at).getTime() > now ? [{ ok: 1 }] : [];
    }

    // ── Personal Chat Clear Cutoffs ──
    if (/SELECT cleared_at_ms FROM personal_chat_clear_cutoffs/i.test(q)) {
      const ts = db.personal_chat_clear_cutoffs.get(`${args[0]}|${args[1]}`);
      return ts ? [{ cleared_at_ms: ts }] : [];
    }

    // ── Event GroupChat ──
    if (/SELECT role FROM event_group_members WHERE event_id = \$1 AND user_id = \$2/i.test(q)) {
      const r = db.event_group_members.get(`${args[0]}|${args[1]}`);
      return r ? [{ role: r.role }] : [];
    }
    if (/SELECT user_id FROM event_group_members WHERE event_id = \$1 AND role = 'COLLABORATOR'/i.test(q)) {
      return Array.from(db.event_group_members.values())
        .filter((r) => r.event_id === String(args[0]) && r.role === 'COLLABORATOR')
        .map((r) => ({ user_id: r.user_id }));
    }
    if (/SELECT user_id FROM event_group_members WHERE event_id = \$1/i.test(q)) {
      return Array.from(db.event_group_members.values())
        .filter((r) => r.event_id === String(args[0]))
        .map((r) => ({ user_id: r.user_id }));
    }
    if (/SELECT user_id, role, joined_at FROM event_group_members WHERE event_id = \$1/i.test(q)) {
      return Array.from(db.event_group_members.values()).filter((r) => r.event_id === String(args[0]));
    }
    if (/SELECT event_id, avatar_url, cover_url/i.test(q)) {
      const m = db.event_group_meta.get(String(args[0]));
      return m ? [m] : [];
    }
    if (/SELECT cleared_at_ms FROM event_group_reads WHERE event_id = \$1 AND user_id = \$2/i.test(q)) {
      const r = db.event_group_reads.get(`${args[0]}|${args[1]}`);
      return r ? [{ cleared_at_ms: r.cleared_at_ms }] : [];
    }
    if (/SELECT id, event_id, sender_id, sender_name, sender_avatar, msg_type, payload_json, ts FROM event_group_messages/i.test(q)) {
      return Array.from(db.event_group_messages.values())
        .filter((m) => m.event_id === String(args[0]) && Number(m.ts) > Number(args[1]))
        .sort((a, b) => Number(b.ts) - Number(a.ts))
        .slice(0, Number(args[2] || 60));
    }
    if (/FROM event_group_calls WHERE event_id = \$1/i.test(q)) {
      const c = db.event_group_calls.get(String(args[0]));
      if (!c) return [];
      if (/AND active = TRUE/i.test(q) && !c.active) return [];
      return [{ ...c }];
    }

    // ── Reels ──
    if (/FROM reels_media_posts WHERE author_id = \$1 AND event_id IS NOT NULL/i.test(q)) {
      return Array.from(db.reels_media_posts.values()).filter(
        (p) => p.author_id === String(args[0]) && p.event_id
      );
    }
    if (/SELECT author_id FROM reels_media_posts WHERE id = \$1/i.test(q)) {
      const p = db.reels_media_posts.get(String(args[0]));
      return p ? [{ author_id: p.author_id }] : [];
    }
    if (/FROM reels_media_posts/i.test(q)) {
      let rows = Array.from(db.reels_media_posts.values());
      if (/visibility = 'public'/i.test(q)) {
        rows = rows.filter((r) => r.visibility === 'public');
      }
      if (/category = \$1/i.test(q)) {
        rows = rows.filter((r) => r.category === String(args[0]));
      }
      const anyIdx = q.match(/author_id = ANY\(\$(\d+)/i);
      if (anyIdx) {
        const allowed = new Set((args[Number(anyIdx[1]) - 1] || []).map(String));
        rows = rows.filter((r) => allowed.has(String(r.author_id)));
      }
      return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (/SELECT 1 AS ok FROM reels_post_likes WHERE post_id = \$1 AND user_id = \$2/i.test(q)) {
      return db.reels_post_likes.has(`${args[0]}|${args[1]}`) ? [{ ok: 1 }] : [];
    }
    if (/SELECT COUNT\(\*\)::int AS cnt FROM reels_post_likes WHERE post_id = \$1/i.test(q)) {
      let cnt = 0;
      for (const k of db.reels_post_likes) if (k.startsWith(`${args[0]}|`)) cnt++;
      return [{ cnt }];
    }
    if (/SELECT post_id, user_id FROM reels_post_likes/i.test(q)) {
      const pids = new Set((args[0] || []).map(String));
      const out = [];
      for (const k of db.reels_post_likes) {
        const [post_id, user_id] = k.split('|');
        if (pids.has(post_id)) out.push({ post_id, user_id });
      }
      return out;
    }
    if (/SELECT post_id, COUNT\(\*\)::int AS cnt FROM reels_post_comments/i.test(q)) {
      const pids = new Set((args[0] || []).map(String));
      const counts = new Map();
      for (const c of db.reels_post_comments.values()) {
        if (pids.has(c.post_id)) counts.set(c.post_id, (counts.get(c.post_id) || 0) + 1);
      }
      return Array.from(counts.entries()).map(([post_id, cnt]) => ({ post_id, cnt }));
    }
    if (/SELECT id, post_id, author_id, body, created_at FROM reels_post_comments WHERE post_id = \$1/i.test(q)) {
      return Array.from(db.reels_post_comments.values()).filter((c) => c.post_id === String(args[0]));
    }

    // ── Event Archives ──
    if (/SELECT is_archive_private FROM user_archive_settings WHERE user_id = \$1/i.test(q)) {
      return db.user_archive_settings.has(String(args[0]))
        ? [{ is_archive_private: db.user_archive_settings.get(String(args[0])) }]
        : [];
    }
    if (/SELECT event_id FROM user_event_archive_deleted WHERE user_id = \$1/i.test(q)) {
      const out = [];
      for (const k of db.user_event_archive_deleted) {
        const [u, e] = k.split('|');
        if (u === String(args[0])) out.push({ event_id: e });
      }
      return out;
    }
    if (/INSERT INTO user_event_archives .* RETURNING id/i.test(q)) {
      for (const row of db.user_event_archives.values()) {
        if (row.user_id === String(args[1]) && row.event_id === String(args[2])) {
          row.event_title = args[3];
          row.event_category = args[4];
          row.event_location = args[5] ?? row.event_location;
          row.updated_at = new Date();
          return [{ id: row.id }];
        }
      }
      db.user_event_archives.set(String(args[0]), {
        id: String(args[0]),
        user_id: String(args[1]),
        event_id: String(args[2]),
        event_title: args[3],
        event_category: args[4],
        event_location: args[5],
        impression: '',
        is_hidden: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      return [{ id: String(args[0]) }];
    }
    if (/SELECT id, user_id, event_id, event_title, event_category, event_location, impression, is_hidden/i.test(q)) {
      return Array.from(db.user_event_archives.values()).filter((a) => a.user_id === String(args[0]));
    }
    if (/SELECT id, archive_id, media_url, thumbnail_url, media_type, caption, source, created_at FROM user_event_archive_media/i.test(q)) {
      const aids = new Set((args[0] || []).map(String));
      return Array.from(db.user_event_archive_media.values()).filter((m) => aids.has(m.archive_id));
    }
    if (/SELECT id, user_id, (impression, is_hidden|event_id) FROM user_event_archives WHERE id = \$1/i.test(q)) {
      const row = db.user_event_archives.get(String(args[0]));
      return row ? [{ ...row }] : [];
    }

    // ── Group Location Blend ──
    if (/SELECT event_id, is_active FROM event_group_blends WHERE event_id = \$1/i.test(q) || /SELECT event_id, created_by, is_active, created_at FROM event_group_blends WHERE event_id = \$1/i.test(q)) {
      const b = db.event_group_blends.get(String(args[0]));
      return b ? [{ ...b }] : [];
    }
    if (/SELECT COUNT\(\*\)::int AS cnt FROM event_group_blend_members WHERE event_id = \$1 AND status = 'joined'/i.test(q)) {
      const cnt = Array.from(db.event_group_blend_members.values()).filter(
        (m) => m.event_id === String(args[0]) && m.status === 'joined'
      ).length;
      return [{ cnt }];
    }
    if (/SELECT status, transport_mode, lat, lng, accuracy, heading, speed, is_stationary FROM event_group_blend_members/i.test(q)) {
      const row = db.event_group_blend_members.get(`${args[0]}|${args[1]}`);
      return row ? [{ ...row }] : [];
    }
    if (/SELECT user_id, status, transport_mode, lat, lng, accuracy, heading, speed, is_stationary, joined_at, updated_at FROM event_group_blend_members/i.test(q)) {
      return Array.from(db.event_group_blend_members.values()).filter(
        (m) => m.event_id === String(args[0]) && m.status === 'joined'
      );
    }
    if (/FROM event_group_blend_members m JOIN event_group_blends b/i.test(q)) {
      const uid = String(args[0]);
      const out = [];
      for (const m of db.event_group_blend_members.values()) {
        const b = db.event_group_blends.get(m.event_id);
        if (m.user_id === uid && m.status === 'joined' && b?.is_active) {
          out.push({ event_id: m.event_id });
        }
      }
      return out;
    }

    return [];
  };

  // In-memory Redis mock (supports direct ops + pipeline())
  const redisImpl = {
    get: async (k) => (kv.has(k) ? kv.get(k) : null),
    set: async (k, v, ...rest) => {
      if (rest.includes('NX') && kv.has(k)) return null;
      kv.set(k, String(v));
      return 'OK';
    },
    setex: async (k, _sec, v) => {
      kv.set(k, String(v));
      return 'OK';
    },
    incr: async (k) => {
      const next = (Number(kv.get(k)) || 0) + 1;
      kv.set(k, String(next));
      return next;
    },
    exists: async (k) => (kv.has(k) || sets.has(k) || lists.has(k) || hashes.has(k) ? 1 : 0),
    ttl: async (k) => (kv.has(k) ? 60 : -2),
    type: async (k) => {
      if (sets.has(k)) return 'set';
      if (lists.has(k)) return 'list';
      if (hashes.has(k)) return 'hash';
      if (kv.has(k)) return 'string';
      return 'none';
    },
    del: async (...keys) => {
      const flat = keys.flat();
      for (const k of flat) {
        kv.delete(k);
        sets.delete(k);
        lists.delete(k);
        hashes.delete(k);
      }
      return flat.length;
    },
    sadd: async (k, ...members) => {
      const s = getSet(k);
      for (const m of members.flat()) s.add(String(m));
      return members.length;
    },
    srem: async (k, ...members) => {
      const s = getSet(k);
      for (const m of members.flat()) s.delete(String(m));
      return members.length;
    },
    smembers: async (k) => Array.from(getSet(k)),
    scard: async (k) => getSet(k).size,
    sismember: async (k, m) => (getSet(k).has(String(m)) ? 1 : 0),
    zadd: async (k, ...args) => {
      const s = getSet(k);
      for (let i = 1; i < args.length; i += 2) s.add(String(args[i]));
      return 1;
    },
    zrange: async (k) => Array.from(getSet(k)),
    zrevrange: async (k) => Array.from(getSet(k)).reverse(),
    zrangebyscore: async (k) => Array.from(getSet(k)),
    zcard: async (k) => getSet(k).size,
    zrem: async (k, ...members) => {
      const s = getSet(k);
      for (const m of members.flat()) s.delete(String(m));
      return members.length;
    },
    zremrangebyscore: async () => 0,
    mget: async (...keys) => {
      const flat = keys.flat();
      return flat.map((k) => (kv.has(k) ? kv.get(k) : null));
    },
    lpush: async (k, ...vals) => {
      const l = getList(k);
      for (const v of vals) l.unshift(String(v));
      return l.length;
    },
    rpush: async (k, ...vals) => {
      const l = getList(k);
      for (const v of vals) l.push(String(v));
      return l.length;
    },
    ltrim: async (k, start, end) => {
      const l = getList(k);
      lists.set(k, l.slice(start, end + 1));
      return 'OK';
    },
    lrange: async (k, start, end) => {
      const l = getList(k);
      return end < 0 ? l.slice(start) : l.slice(start, end + 1);
    },
    llen: async (k) => getList(k).length,
    hset: async (k, field, val) => {
      const h = getHash(k);
      if (field && typeof field === 'object') Object.assign(h, field);
      else h[String(field)] = String(val);
      return 1;
    },
    hget: async (k, field) => (Object.prototype.hasOwnProperty.call(getHash(k), field) ? getHash(k)[field] : null),
    hdel: async (k, ...fields) => {
      const h = getHash(k);
      for (const f of fields.flat()) delete h[f];
      return fields.length;
    },
    hgetall: async (k) => ({ ...getHash(k) }),
    expire: async () => 1,
    ping: async () => 'PONG',
    eval: async (_script, _numKeys, key, expectedVal) => {
      if (kv.get(key) === String(expectedVal)) {
        kv.delete(key);
        return 1;
      }
      return 0;
    },
    pipeline: () => {
      const ops = [];
      const pipe = {
        exec: async () => {
          const results = [];
          for (const [fn, fnArgs] of ops) {
            const val = await redisImpl[fn](...fnArgs);
            results.push([null, val]);
          }
          return results;
        },
      };
      for (const fn of Object.keys(redisImpl)) {
        if (fn === 'pipeline' || fn === 'multi') continue;
        pipe[fn] = (...fnArgs) => {
          ops.push([fn, fnArgs]);
          return pipe;
        };
      }
      return pipe;
    },
  };
  redisImpl.multi = redisImpl.pipeline;

  for (const [k, fn] of Object.entries(redisImpl)) {
    orig.redisMethods[k] = redis[k];
    redis[k] = fn;
  }

  // Clear L1 hot caches so tests never inherit stale values across runs
  redis.del(
    'cache:all_kalcerians',
    'cache:map_users_enriched',
    'cache:active_mini_events',
    'cache:mini_events:active_list:v1'
  ).catch(() => {});

  function restore() {
    prisma.$executeRawUnsafe = orig.$executeRawUnsafe;
    prisma.$queryRawUnsafe = orig.$queryRawUnsafe;
    prisma.user.findUnique = orig.userFindUnique;
    prisma.user.findMany = orig.userFindMany;
    prisma.user.update = orig.userUpdate;
    prisma.miniEvent.findUnique = orig.miniEventFindUnique;
    prisma.miniEvent.findFirst = orig.miniEventFindFirst;
    prisma.miniEvent.findMany = orig.miniEventFindMany;
    if (prisma.callLock && orig.callLockFindUnique) {
      prisma.callLock.findUnique = orig.callLockFindUnique;
      prisma.callLock.upsert = orig.callLockUpsert;
      prisma.callLock.deleteMany = orig.callLockDeleteMany;
    }
    if (prisma.callSignal && orig.callSigCreate) {
      prisma.callSignal.create = orig.callSigCreate;
      prisma.callSignal.findMany = orig.callSigFindMany;
      prisma.callSignal.deleteMany = orig.callSigDeleteMany;
    }
    if (prisma.userPresence && orig.userPresenceFindMany) {
      prisma.userPresence.upsert = orig.userPresenceUpsert;
      prisma.userPresence.findMany = orig.userPresenceFindMany;
      prisma.userPresence.deleteMany = orig.userPresenceDeleteMany;
    }
    if (prisma.eventNotification && orig.eventNotifFindMany) {
      prisma.eventNotification.create = orig.eventNotifCreate;
      prisma.eventNotification.findMany = orig.eventNotifFindMany;
      prisma.eventNotification.deleteMany = orig.eventNotifDeleteMany;
    }
    for (const [k, fn] of Object.entries(orig.redisMethods)) {
      redis[k] = fn;
    }
  }

  return { db, kv, sets, restore };
}
