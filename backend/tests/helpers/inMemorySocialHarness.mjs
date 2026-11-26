/**
 * Isolated In-Memory Prisma + Redis Test Harness for Kalceria Social/Map Controllers.
 *
 * Guarantees:
 * - ZERO real Postgres / Upstash Redis TCP calls (100% offline & deterministic)
 * - ZERO production DB residue (`AGENTS.md` §1.6 compliant)
 * - Exercises REAL Express controllers, stores, SQL state transitions & auth guards
 */

import crypto from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { redis, __setRedisTestClient } from '../../lib/redis.js';

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

export function installInMemorySocialHarness({ users = [], miniEvents = [], events = [] } = {}) {
  const db = {
    users: new Map(users.map((u) => [String(u.id), { ...u }])),
    miniEvents: new Map(miniEvents.map((e) => [String(e.id), { ...e }])),
    events: new Map(events.map((e) => [String(e.id), { ...e }])),
    auditLogs: [],
    comments: [],
    personalChatMessages: new Map(), // id -> row
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
  const kvExpiry = new Map();
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
    $transaction: prisma.$transaction,
    $disconnect: prisma.$disconnect,
    userFindUnique: prisma.user.findUnique,
    userFindFirst: prisma.user.findFirst,
    userFindMany: prisma.user.findMany,
    userCreate: prisma.user.create,
    userUpdate: prisma.user.update,
    userDelete: prisma.user.delete,
    userDeleteMany: prisma.user.deleteMany,
    userCount: prisma.user.count,
    miniEventFindUnique: prisma.miniEvent.findUnique,
    miniEventFindFirst: prisma.miniEvent.findFirst,
    miniEventFindMany: prisma.miniEvent.findMany,
    miniEventUpdate: prisma.miniEvent.update,
    miniEventDeleteMany: prisma.miniEvent.deleteMany,
    personalChatCreate: prisma.personalChatMessage?.create,
    personalChatUpdate: prisma.personalChatMessage?.update,
    personalChatUpdateMany: prisma.personalChatMessage?.updateMany,
    personalChatFindMany: prisma.personalChatMessage?.findMany,
    personalChatCount: prisma.personalChatMessage?.count,
    personalChatDeleteMany: prisma.personalChatMessage?.deleteMany,
    personalChatGroupBy: prisma.personalChatMessage?.groupBy,
    eventCreate: prisma.event?.create,
    eventFindUnique: prisma.event?.findUnique,
    eventFindFirst: prisma.event?.findFirst,
    eventFindMany: prisma.event?.findMany,
    eventUpdate: prisma.event?.update,
    eventUpdateMany: prisma.event?.updateMany,
    eventDelete: prisma.event?.delete,
    eventDeleteMany: prisma.event?.deleteMany,
    auditLogCreate: prisma.auditLog?.create,
    auditLogFindFirst: prisma.auditLog?.findFirst,
    auditLogFindMany: prisma.auditLog?.findMany,
    auditLogDeleteMany: prisma.auditLog?.deleteMany,
    commentCreate: prisma.comment?.create,
    commentFindMany: prisma.comment?.findMany,
    commentDeleteMany: prisma.comment?.deleteMany,
    userBroadcastDeleteMany: prisma.userBroadcast?.deleteMany,
    eventRegDeleteMany: prisma.eventRegistration?.deleteMany,
    bookingDeleteMany: prisma.booking?.deleteMany,
    serviceBookingFindMany: prisma.serviceBooking?.findMany,
    serviceBookingDeleteMany: prisma.serviceBooking?.deleteMany,
    serviceBookingSlotDeleteMany: prisma.serviceBookingSlot?.deleteMany,
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

  prisma.$transaction = async (fn) => (typeof fn === 'function' ? fn(prisma) : Promise.all(fn));
  prisma.$disconnect = async () => {};

  function matchUserWhere(u, where = {}) {
    if (!where) return true;
    if (where.id && typeof where.id === 'string' && String(u.id) !== String(where.id)) return false;
    if (where.id?.in && !where.id.in.map(String).includes(String(u.id))) return false;
    if (where.NOT?.id && String(u.id) === String(where.NOT.id)) return false;
    if (where.email) {
      if (typeof where.email === 'string') {
        if (String(u.email || '').toLowerCase() !== where.email.toLowerCase()) return false;
      } else if (where.email.equals) {
        if (String(u.email || '').toLowerCase() !== String(where.email.equals).toLowerCase()) return false;
      } else if (where.email.contains) {
        if (!String(u.email || '').toLowerCase().includes(String(where.email.contains).toLowerCase())) return false;
      }
    }
    if (where.name) {
      const target = typeof where.name === 'string' ? where.name : where.name.equals;
      if (target && String(u.name || '').toLowerCase() !== String(target).toLowerCase()) return false;
    }
    if (where.nickname) {
      const target = typeof where.nickname === 'string' ? where.nickname : where.nickname.equals;
      if (target && String(u.nickname || '').toLowerCase() !== String(target).toLowerCase()) return false;
    }
    if (where.isEmailVerified !== undefined && Boolean(u.isEmailVerified) !== Boolean(where.isEmailVerified)) return false;
    if (where.role && (u.role || 'USER') !== where.role) return false;
    if (where.OR && !where.OR.some((sub) => matchUserWhere(u, sub))) return false;
    return true;
  }

  // In-memory Prisma Model delegates
  prisma.user.findUnique = async ({ where }) => {
    if (where?.id) {
      const u = db.users.get(String(where.id));
      return u ? { ...u } : null;
    }
    if (where?.email) {
      for (const u of db.users.values()) {
        if (String(u.email || '').toLowerCase() === String(where.email).toLowerCase()) return { ...u };
      }
    }
    return null;
  };
  prisma.user.findFirst = async ({ where } = {}) => {
    for (const u of db.users.values()) {
      if (matchUserWhere(u, where)) return { ...u };
    }
    return null;
  };
  prisma.user.findMany = async ({ where } = {}) => {
    return Array.from(db.users.values())
      .filter((u) => matchUserWhere(u, where))
      .map((u) => ({ ...u }));
  };
  prisma.user.create = async ({ data }) => {
    const id = data.id || `usr_${crypto.randomUUID()}`;
    const row = {
      role: 'USER',
      isEmailVerified: false,
      allowLiveLocation: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
      id: String(id),
    };
    db.users.set(String(id), row);
    return { ...row };
  };
  prisma.user.update = async ({ where, data }) => {
    let target = null;
    if (where?.id) target = db.users.get(String(where.id)) || null;
    else if (where?.email) {
      for (const u of db.users.values()) {
        if (String(u.email || '').toLowerCase() === String(where.email).toLowerCase()) {
          target = u;
          break;
        }
      }
    }
    if (!target) return null;
    Object.assign(target, data, { updatedAt: new Date() });
    return { ...target };
  };
  prisma.user.delete = async ({ where }) => {
    let target = null;
    if (where?.id) target = db.users.get(String(where.id)) || null;
    else if (where?.email) {
      for (const u of db.users.values()) {
        if (String(u.email || '').toLowerCase() === String(where.email).toLowerCase()) {
          target = u;
          break;
        }
      }
    }
    if (target) db.users.delete(String(target.id));
    return target ? { ...target } : null;
  };
  prisma.user.deleteMany = async ({ where } = {}) => {
    let count = 0;
    for (const [id, u] of Array.from(db.users.entries())) {
      if (matchUserWhere(u, where)) {
        db.users.delete(id);
        count++;
      }
    }
    return { count };
  };
  prisma.user.count = async ({ where } = {}) => {
    return Array.from(db.users.values()).filter((u) => matchUserWhere(u, where)).length;
  };

  prisma.miniEvent.findUnique = async ({ where }) => {
    const ev = db.miniEvents.get(String(where?.id));
    return ev ? { ...ev } : null;
  };
  prisma.miniEvent.findFirst = async ({ where } = {}) => {
    for (const ev of db.miniEvents.values()) {
      if (where?.id && String(ev.id) !== String(where.id)) continue;
      if (where?.creatorId && String(ev.creatorId) !== String(where.creatorId)) continue;
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
    if (where?.creatorId) {
      list = list.filter((e) => String(e.creatorId) === String(where.creatorId));
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
  prisma.miniEvent.update = async ({ where, data }) => {
    const ev = db.miniEvents.get(String(where?.id));
    if (!ev) return null;
    Object.assign(ev, data);
    return { ...ev };
  };
  prisma.miniEvent.deleteMany = async ({ where } = {}) => {
    let count = 0;
    for (const [id, ev] of Array.from(db.miniEvents.entries())) {
      if (where?.creatorId && String(ev.creatorId) !== String(where.creatorId)) continue;
      if (where?.id?.in && !where.id.in.map(String).includes(id)) continue;
      db.miniEvents.delete(id);
      count++;
    }
    return { count };
  };

  if (prisma.personalChatMessage) {
    prisma.personalChatMessage.create = async ({ data }) => {
      const id = String(data.id);
      if (db.personalChatMessages.has(id)) {
        const err = new Error('Unique constraint failed');
        err.code = 'P2002';
        throw err;
      }
      const row = { createdAt: new Date(), ...data, id };
      db.personalChatMessages.set(id, row);
      return { ...row };
    };
    prisma.personalChatMessage.update = async ({ where, data }) => {
      const row = db.personalChatMessages.get(String(where.id));
      if (!row) return null;
      Object.assign(row, data);
      return { ...row };
    };
    prisma.personalChatMessage.updateMany = async ({ where = {}, data = {} }) => {
      let count = 0;
      for (const row of db.personalChatMessages.values()) {
        if (where.id?.in && !where.id.in.map(String).includes(String(row.id))) continue;
        if (where.convHash && row.convHash !== where.convHash) continue;
        if (where.senderId && String(row.senderId) !== String(where.senderId)) continue;
        if (where.recipientId && String(row.recipientId) !== String(where.recipientId)) continue;
        if (where.status?.not && row.status === where.status.not) continue;
        if (where.status?.notIn && where.status.notIn.includes(row.status)) continue;
        if (where.ts?.lte !== undefined && BigInt(row.ts) > BigInt(where.ts.lte)) continue;
        if (Array.isArray(where.OR)) {
          const matchesOr = where.OR.some((clause) => {
            if (clause.id?.in && clause.id.in.map(String).includes(String(row.id))) return true;
            if (clause.ts?.lte !== undefined && BigInt(row.ts) <= BigInt(clause.ts.lte)) return true;
            return false;
          });
          if (!matchesOr) continue;
        }
        Object.assign(row, data);
        count++;
      }
      return { count };
    };
    prisma.personalChatMessage.findMany = async ({ where = {}, orderBy, take, distinct } = {}) => {
      let rows = Array.from(db.personalChatMessages.values());
      if (where.convHash) rows = rows.filter((r) => r.convHash === where.convHash);
      if (where.recipientId) rows = rows.filter((r) => String(r.recipientId) === String(where.recipientId));
      if (where.senderId?.in) {
        const s = new Set(where.senderId.in.map(String));
        rows = rows.filter((r) => s.has(String(r.senderId)));
      } else if (where.senderId) {
        rows = rows.filter((r) => String(r.senderId) === String(where.senderId));
      }
      if (where.status?.not) rows = rows.filter((r) => r.status !== where.status.not);
      if (where.status?.notIn) rows = rows.filter((r) => !where.status.notIn.includes(r.status));
      if (where.ts?.lt !== undefined) rows = rows.filter((r) => BigInt(r.ts) < BigInt(where.ts.lt));
      if (where.ts?.gt !== undefined) rows = rows.filter((r) => BigInt(r.ts) > BigInt(where.ts.gt));
      if (where.ts?.lte !== undefined) rows = rows.filter((r) => BigInt(r.ts) <= BigInt(where.ts.lte));
      if (orderBy?.ts === 'asc') {
        rows.sort((a, b) => (BigInt(a.ts) > BigInt(b.ts) ? 1 : BigInt(a.ts) < BigInt(b.ts) ? -1 : 0));
      } else {
        rows.sort((a, b) => (BigInt(b.ts) > BigInt(a.ts) ? 1 : BigInt(b.ts) < BigInt(a.ts) ? -1 : 0));
      }
      if (Array.isArray(distinct) && distinct.length > 0) {
        const seen = new Set();
        rows = rows.filter((r) => {
          const k = distinct.map((f) => String(r[f])).join('|');
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
      if (Number.isFinite(take)) rows = rows.slice(0, take);
      return rows.map((r) => ({ ...r }));
    };
    prisma.personalChatMessage.count = async ({ where = {} } = {}) => {
      return (await prisma.personalChatMessage.findMany({ where })).length;
    };
    prisma.personalChatMessage.deleteMany = async ({ where = {} } = {}) => {
      let count = 0;
      for (const [id, r] of Array.from(db.personalChatMessages.entries())) {
        if (where.convHash && r.convHash !== where.convHash) continue;
        if (where.id?.in && !where.id.in.map(String).includes(id)) continue;
        if (where.OR) {
          const ok = where.OR.some(
            (c) => (c.senderId && String(r.senderId) === String(c.senderId)) || (c.recipientId && String(r.recipientId) === String(c.recipientId))
          );
          if (!ok) continue;
        }
        db.personalChatMessages.delete(id);
        count++;
      }
      return { count };
    };
    prisma.personalChatMessage.groupBy = async ({ where = {} } = {}) => {
      const rows = await prisma.personalChatMessage.findMany({ where });
      const counts = new Map();
      for (const r of rows) counts.set(r.senderId, (counts.get(r.senderId) || 0) + 1);
      return Array.from(counts.entries()).map(([senderId, c]) => ({ senderId, _count: { _all: c } }));
    };
  }

  if (prisma.event) {
    function matchEventWhere(ev, where = {}) {
      if (!where) return true;
      if (where.id) {
        if (typeof where.id === 'string' && String(ev.id) !== where.id) return false;
        if (where.id.in && !where.id.in.map(String).includes(String(ev.id))) return false;
        if (where.id.not && String(ev.id) === String(where.id.not)) return false;
      }
      if (where.isMinigameTarget !== undefined && Boolean(ev.isMinigameTarget) !== Boolean(where.isMinigameTarget)) return false;
      if (where.status && ev.status !== where.status) return false;
      if (where.regEndTime?.lte && new Date(ev.regEndTime) > new Date(where.regEndTime.lte)) return false;
      if (where.regEndTime?.gt && new Date(ev.regEndTime) <= new Date(where.regEndTime.gt)) return false;
      return true;
    }
    prisma.event.create = async ({ data }) => {
      const id = String(data.id || `evt_${crypto.randomUUID()}`);
      const row = { createdAt: new Date(), updatedAt: new Date(), isMinigameTarget: false, ...data, id };
      db.events.set(id, row);
      return { ...row };
    };
    prisma.event.findUnique = async ({ where }) => {
      const ev = db.events.get(String(where?.id));
      return ev ? { ...ev } : null;
    };
    prisma.event.findFirst = async ({ where } = {}) => {
      for (const ev of db.events.values()) {
        if (matchEventWhere(ev, where)) return { ...ev };
      }
      return null;
    };
    prisma.event.findMany = async ({ where } = {}) => {
      return Array.from(db.events.values()).filter((ev) => matchEventWhere(ev, where)).map((ev) => ({ ...ev }));
    };
    prisma.event.update = async ({ where, data }) => {
      const ev = db.events.get(String(where?.id));
      if (!ev) return null;
      Object.assign(ev, data, { updatedAt: new Date() });
      return { ...ev };
    };
    prisma.event.updateMany = async ({ where, data }) => {
      let count = 0;
      for (const ev of db.events.values()) {
        if (matchEventWhere(ev, where)) {
          Object.assign(ev, data, { updatedAt: new Date() });
          count++;
        }
      }
      return { count };
    };
    prisma.event.delete = async ({ where }) => {
      const ev = db.events.get(String(where?.id));
      if (ev) db.events.delete(String(where.id));
      return ev ? { ...ev } : null;
    };
    prisma.event.deleteMany = async ({ where } = {}) => {
      let count = 0;
      for (const [id, ev] of Array.from(db.events.entries())) {
        if (matchEventWhere(ev, where)) {
          db.events.delete(id);
          count++;
        }
      }
      return { count };
    };
  }

  if (prisma.auditLog) {
    function matchAuditWhere(l, where = {}) {
      if (!where) return true;
      if (where.action && l.action !== where.action) return false;
      if (where.adminEmail) {
        if (typeof where.adminEmail === 'string' && l.adminEmail !== where.adminEmail) return false;
        if (where.adminEmail.in && !where.adminEmail.in.includes(l.adminEmail)) return false;
      }
      if (where.createdAt?.gte && new Date(l.createdAt) < new Date(where.createdAt.gte)) return false;
      return true;
    }
    prisma.auditLog.create = async ({ data }) => {
      const row = { id: `audit_${db.auditLogs.length + 1}`, createdAt: new Date(), ...data };
      db.auditLogs.push(row);
      return { ...row };
    };
    prisma.auditLog.findFirst = async ({ where } = {}) => {
      const hit = db.auditLogs.find((l) => matchAuditWhere(l, where));
      return hit ? { ...hit } : null;
    };
    prisma.auditLog.findMany = async ({ where, orderBy, take } = {}) => {
      let rows = db.auditLogs.filter((l) => matchAuditWhere(l, where));
      if (orderBy?.createdAt === 'desc') rows = [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (Number.isFinite(take)) rows = rows.slice(0, take);
      return rows.map((r) => ({ ...r }));
    };
    prisma.auditLog.deleteMany = async ({ where } = {}) => {
      const before = db.auditLogs.length;
      db.auditLogs = db.auditLogs.filter((l) => !matchAuditWhere(l, where));
      return { count: before - db.auditLogs.length };
    };
  }

  if (prisma.comment) {
    prisma.comment.create = async ({ data }) => {
      const row = { id: `cmt_${db.comments.length + 1}`, createdAt: new Date(), ...data };
      db.comments.push(row);
      return { ...row };
    };
    prisma.comment.findMany = async () => db.comments.map((c) => ({ ...c }));
    prisma.comment.deleteMany = async ({ where } = {}) => {
      const before = db.comments.length;
      db.comments = where?.userId ? db.comments.filter((c) => String(c.userId) !== String(where.userId)) : [];
      return { count: before - db.comments.length };
    };
  }

  if (prisma.userBroadcast) prisma.userBroadcast.deleteMany = async () => ({ count: 0 });
  if (prisma.eventRegistration) prisma.eventRegistration.deleteMany = async () => ({ count: 0 });
  if (prisma.booking) prisma.booking.deleteMany = async () => ({ count: 0 });
  if (prisma.serviceBooking) {
    prisma.serviceBooking.findMany = async () => [];
    prisma.serviceBooking.deleteMany = async () => ({ count: 0 });
  }
  if (prisma.serviceBookingSlot) prisma.serviceBookingSlot.deleteMany = async () => ({ count: 0 });

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

  // In-memory Redis mock (supports direct ops + pipeline() + multi() + TTL + glob keys)
  const redisImpl = {
    get: async (k) => {
      const exp = kvExpiry.get(k);
      if (exp !== undefined && Date.now() > exp) {
        kv.delete(k);
        kvExpiry.delete(k);
        return null;
      }
      return kv.has(k) ? kv.get(k) : null;
    },
    set: async (k, v, ...rest) => {
      const upper = rest.map((x) => String(x).toUpperCase());
      if (upper.includes('NX') && kv.has(k)) return null;
      kv.set(k, String(v));
      const exIdx = upper.indexOf('EX');
      const pxIdx = upper.indexOf('PX');
      if (exIdx >= 0 && Number.isFinite(Number(rest[exIdx + 1]))) {
        kvExpiry.set(k, Date.now() + Number(rest[exIdx + 1]) * 1000);
      } else if (pxIdx >= 0 && Number.isFinite(Number(rest[pxIdx + 1]))) {
        kvExpiry.set(k, Date.now() + Number(rest[pxIdx + 1]));
      } else {
        kvExpiry.delete(k);
      }
      return 'OK';
    },
    setex: async (k, sec, v) => {
      kv.set(k, String(v));
      if (Number.isFinite(Number(sec))) kvExpiry.set(k, Date.now() + Number(sec) * 1000);
      return 'OK';
    },
    incr: async (k) => {
      const next = (Number(kv.get(k)) || 0) + 1;
      kv.set(k, String(next));
      return next;
    },
    exists: async (k) => (kv.has(k) || sets.has(k) || lists.has(k) || hashes.has(k) ? 1 : 0),
    ttl: async (k) => {
      if (!kv.has(k) && !sets.has(k) && !lists.has(k) && !hashes.has(k)) return -2;
      const exp = kvExpiry.get(k);
      if (exp === undefined) return -1;
      const rem = Math.ceil((exp - Date.now()) / 1000);
      return rem > 0 ? rem : -2;
    },
    keys: async (pattern = '*') => {
      const escaped = String(pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const re = new RegExp(`^${escaped}$`);
      const all = new Set([...kv.keys(), ...sets.keys(), ...lists.keys(), ...hashes.keys()]);
      return Array.from(all).filter((k) => re.test(k));
    },
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
        kvExpiry.delete(k);
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
    ltrim: async (k, start, stop) => {
      const l = getList(k);
      const s = start < 0 ? Math.max(0, l.length + start) : start;
      const e = stop < 0 ? l.length + stop + 1 : stop + 1;
      lists.set(k, l.slice(s, e));
      return 'OK';
    },
    lrange: async (k, start, stop) => {
      const l = getList(k);
      const s = start < 0 ? Math.max(0, l.length + start) : start;
      const e = stop < 0 ? l.length + stop + 1 : stop + 1;
      return l.slice(s, e);
    },
    lindex: async (k, idx) => {
      const l = getList(k);
      const resolved = idx < 0 ? l.length + idx : idx;
      return resolved >= 0 && resolved < l.length ? l[resolved] : null;
    },
    llen: async (k) => getList(k).length,
    hset: async (k, ...args) => {
      const h = getHash(k);
      if (args.length === 1 && args[0] && typeof args[0] === 'object') {
        for (const [f, v] of Object.entries(args[0])) h[String(f)] = String(v);
      } else {
        for (let i = 0; i < args.length; i += 2) {
          h[String(args[i])] = String(args[i + 1]);
        }
      }
      return 1;
    },
    hget: async (k, field) => (Object.prototype.hasOwnProperty.call(getHash(k), String(field)) ? getHash(k)[String(field)] : null),
    hincrby: async (k, field, delta) => {
      const h = getHash(k);
      const next = (Number(h[String(field)]) || 0) + Number(delta);
      h[String(field)] = String(next);
      return next;
    },
    hdel: async (k, ...fields) => {
      const h = getHash(k);
      for (const f of fields.flat()) delete h[String(f)];
      return fields.length;
    },
    hgetall: async (k) => ({ ...getHash(k) }),
    expire: async (k, sec) => {
      if (Number.isFinite(Number(sec))) kvExpiry.set(k, Date.now() + Number(sec) * 1000);
      return 1;
    },
    ping: async () => 'PONG',
    quit: async () => 'OK',
    disconnect: () => {},
    eval: async (script, _numKeys, key, arg1) => {
      const s = String(script || '');
      // Pattern 1: Rate limiter atomic INCR + EXPIRE + TTL
      if (/INCR/i.test(s) && /TTL/i.test(s)) {
        const count = await redisImpl.incr(key);
        const ttlSec = Number(arg1) || 60;
        if (count === 1) await redisImpl.expire(key, ttlSec);
        const rem = await redisImpl.ttl(key);
        return [count, rem > 0 ? rem : ttlSec];
      }
      // Pattern 2: Atomic single-use token consume (GET + DEL)
      if (/GET/i.test(s) && /DEL/i.test(s) && !/ARGV\[1\]/i.test(s)) {
        const val = await redisImpl.get(key);
        if (val !== null) await redisImpl.del(key);
        return val;
      }
      // Pattern 3: Compare-and-delete distributed lock
      if (kv.get(key) === String(arg1)) {
        await redisImpl.del(key);
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

  // Bind test override directly on Redis Proxy & disconnect background ioredis socket
  // so Upstash quota/network events can NEVER race or hijack mid-test.
  __setRedisTestClient(redisImpl);

  function restore() {
    __setRedisTestClient(null);
    prisma.$executeRawUnsafe = orig.$executeRawUnsafe;
    prisma.$queryRawUnsafe = orig.$queryRawUnsafe;
    prisma.$transaction = orig.$transaction;
    prisma.$disconnect = orig.$disconnect;
    prisma.user.findUnique = orig.userFindUnique;
    prisma.user.findFirst = orig.userFindFirst;
    prisma.user.findMany = orig.userFindMany;
    prisma.user.create = orig.userCreate;
    prisma.user.update = orig.userUpdate;
    prisma.user.delete = orig.userDelete;
    prisma.user.deleteMany = orig.userDeleteMany;
    prisma.user.count = orig.userCount;
    prisma.miniEvent.findUnique = orig.miniEventFindUnique;
    prisma.miniEvent.findFirst = orig.miniEventFindFirst;
    prisma.miniEvent.findMany = orig.miniEventFindMany;
    prisma.miniEvent.update = orig.miniEventUpdate;
    prisma.miniEvent.deleteMany = orig.miniEventDeleteMany;
    if (prisma.personalChatMessage && orig.personalChatCreate) {
      prisma.personalChatMessage.create = orig.personalChatCreate;
      prisma.personalChatMessage.update = orig.personalChatUpdate;
      prisma.personalChatMessage.updateMany = orig.personalChatUpdateMany;
      prisma.personalChatMessage.findMany = orig.personalChatFindMany;
      prisma.personalChatMessage.count = orig.personalChatCount;
      prisma.personalChatMessage.deleteMany = orig.personalChatDeleteMany;
      prisma.personalChatMessage.groupBy = orig.personalChatGroupBy;
    }
    if (prisma.event && orig.eventCreate) {
      prisma.event.create = orig.eventCreate;
      prisma.event.findUnique = orig.eventFindUnique;
      prisma.event.findFirst = orig.eventFindFirst;
      prisma.event.findMany = orig.eventFindMany;
      prisma.event.update = orig.eventUpdate;
      prisma.event.updateMany = orig.eventUpdateMany;
      prisma.event.delete = orig.eventDelete;
      prisma.event.deleteMany = orig.eventDeleteMany;
    }
    if (prisma.auditLog && orig.auditLogCreate) {
      prisma.auditLog.create = orig.auditLogCreate;
      prisma.auditLog.findFirst = orig.auditLogFindFirst;
      prisma.auditLog.findMany = orig.auditLogFindMany;
      prisma.auditLog.deleteMany = orig.auditLogDeleteMany;
    }
    if (prisma.comment && orig.commentCreate) {
      prisma.comment.create = orig.commentCreate;
      prisma.comment.findMany = orig.commentFindMany;
      prisma.comment.deleteMany = orig.commentDeleteMany;
    }
    if (prisma.userBroadcast && orig.userBroadcastDeleteMany) prisma.userBroadcast.deleteMany = orig.userBroadcastDeleteMany;
    if (prisma.eventRegistration && orig.eventRegDeleteMany) prisma.eventRegistration.deleteMany = orig.eventRegDeleteMany;
    if (prisma.booking && orig.bookingDeleteMany) prisma.booking.deleteMany = orig.bookingDeleteMany;
    if (prisma.serviceBooking && orig.serviceBookingFindMany) {
      prisma.serviceBooking.findMany = orig.serviceBookingFindMany;
      prisma.serviceBooking.deleteMany = orig.serviceBookingDeleteMany;
    }
    if (prisma.serviceBookingSlot && orig.serviceBookingSlotDeleteMany) {
      prisma.serviceBookingSlot.deleteMany = orig.serviceBookingSlotDeleteMany;
    }
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
  }

  return { db, kv, sets, redisImpl, restore };
}
