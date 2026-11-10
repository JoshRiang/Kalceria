import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';

const CALL_SIGNAL_TTL_MS = 60_000;
const CALL_LOCK_TTL_MS = 35_000;
const EVENT_NOTIF_TTL_MS = 86_400_000;
const PRESENCE_ACTIVE_WINDOW_MS = 25_000;

// ─── Ephemeral Pruning Throttler ──────────────────────────────────────────────
let lastPruneTs = 0;
const PRUNE_INTERVAL_MS = 60_000;

async function opportunisticPrune() {
  const now = Date.now();
  if (now - lastPruneTs < PRUNE_INTERVAL_MS) return;
  lastPruneTs = now;
  try {
    const nowDate = new Date(now);
    const stalePresenceDate = new Date(now - 120_000);
    await Promise.allSettled([
      prisma.callSignal.deleteMany({ where: { expiresAt: { lte: nowDate } } }),
      prisma.callLock.deleteMany({ where: { expiresAt: { lte: nowDate } } }),
      prisma.eventNotification.deleteMany({ where: { expiresAt: { lte: nowDate } } }),
      prisma.userPresence.deleteMany({ where: { updatedAt: { lte: stalePresenceDate } } }),
    ]);
  } catch {}
}

// ─── 1. Call Signals & Locks ──────────────────────────────────────────────────
export async function storeCanonicalCallSignal(packet) {
  if (!packet || !packet.toUserId) return;
  opportunisticPrune().catch(() => {});
  const id = packet.id || `sig_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + CALL_SIGNAL_TTL_MS);
  try {
    await prisma.callSignal.create({
      data: {
        id,
        callId: String(packet.callId || 'unknown'),
        fromUserId: String(packet.fromUserId || ''),
        toUserId: String(packet.toUserId),
        signalType: String(packet.signalType || ''),
        packetJson: JSON.stringify(packet),
        expiresAt,
      },
    });
  } catch (err) {
    console.warn('[CanonicalStore] storeCanonicalCallSignal error:', err?.message);
  }
}

export async function fetchCanonicalCallSignals(userId, { clear = false } = {}) {
  if (!userId) return [];
  opportunisticPrune().catch(() => {});
  const nowDate = new Date();
  try {
    const rows = await prisma.callSignal.findMany({
      where: {
        toUserId: String(userId),
        expiresAt: { gt: nowDate },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    if (clear && rows.length > 0) {
      const ids = rows.map((r) => r.id);
      prisma.callSignal.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    }

    const packets = [];
    for (const r of rows) {
      try {
        packets.push(JSON.parse(r.packetJson));
      } catch {}
    }
    return packets;
  } catch (err) {
    console.warn('[CanonicalStore] fetchCanonicalCallSignals error:', err?.message);
    return [];
  }
}

export async function clearCanonicalCallSignals(userId) {
  if (!userId) return;
  try {
    await prisma.callSignal.deleteMany({
      where: { toUserId: String(userId) },
    });
  } catch {}
}

export async function acquireCanonicalCallLock({ userId, targetId, callId, mode }) {
  if (!userId || !targetId) return { ok: true };
  const expiresAt = new Date(Date.now() + CALL_LOCK_TTL_MS);
  try {
    // Check if target is already locked in a different active call
    const existing = await prisma.callLock.findUnique({
      where: { userId: String(targetId) },
    });
    if (existing && existing.expiresAt > new Date()) {
      const isSameCall = existing.callId === callId;
      const isSamePeer =
        (existing.callerId === String(userId) && existing.calleeId === String(targetId)) ||
        (existing.callerId === String(targetId) && existing.calleeId === String(userId));
      if (!isSameCall && !isSamePeer) {
        return { ok: false, busy: true };
      }
    }

    const lockData = {
      callId: String(callId),
      callerId: String(userId),
      calleeId: String(targetId),
      mode: mode === 'video' ? 'video' : 'voice',
      expiresAt,
    };

    await Promise.all([
      prisma.callLock.upsert({
        where: { userId: String(userId) },
        update: lockData,
        create: { userId: String(userId), ...lockData },
      }),
      prisma.callLock.upsert({
        where: { userId: String(targetId) },
        update: lockData,
        create: { userId: String(targetId), ...lockData },
      }),
    ]);
    return { ok: true };
  } catch (err) {
    console.warn('[CanonicalStore] acquireCanonicalCallLock error:', err?.message);
    return { ok: true };
  }
}

export async function releaseCanonicalCallLock(userId, targetId) {
  try {
    const userIds = [String(userId)];
    if (targetId) userIds.push(String(targetId));
    await prisma.callLock.deleteMany({
      where: { userId: { in: userIds } },
    });
  } catch {}
}

export async function getCanonicalCallLock(userId) {
  if (!userId) return null;
  try {
    const lock = await prisma.callLock.findUnique({
      where: { userId: String(userId) },
    });
    if (lock && lock.expiresAt > new Date()) {
      return lock;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── 2. Event Notifications ───────────────────────────────────────────────────
export async function storeCanonicalEventNotification(recipientId, notification) {
  if (!recipientId || !notification) return;
  opportunisticPrune().catch(() => {});
  const id = notification.id || `notif_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + EVENT_NOTIF_TTL_MS);
  try {
    await prisma.eventNotification.create({
      data: {
        id,
        recipientId: String(recipientId),
        type: String(notification.type || 'event'),
        payloadJson: JSON.stringify(notification),
        expiresAt,
      },
    });
  } catch (err) {
    console.warn('[CanonicalStore] storeCanonicalEventNotification error:', err?.message);
  }
}

export async function fetchCanonicalEventNotifications(recipientId) {
  if (!recipientId) return [];
  opportunisticPrune().catch(() => {});
  const nowDate = new Date();
  try {
    const rows = await prisma.eventNotification.findMany({
      where: {
        recipientId: String(recipientId),
        expiresAt: { gt: nowDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const notifs = [];
    for (const r of rows) {
      try {
        notifs.push(JSON.parse(r.payloadJson));
      } catch {}
    }
    return notifs;
  } catch (err) {
    console.warn('[CanonicalStore] fetchCanonicalEventNotifications error:', err?.message);
    return [];
  }
}

export async function clearCanonicalEventNotifications(recipientId) {
  if (!recipientId) return;
  try {
    await prisma.eventNotification.deleteMany({
      where: { recipientId: String(recipientId) },
    });
  } catch {}
}

// ─── 3. Unread Chat & Inbox Summary Fallback ──────────────────────────────────
export async function getCanonicalInboxSummary(userId) {
  if (!userId) return { peers: {}, rawEventNotifs: [], ver: '0' };
  try {
    // 1. Group unread messages by senderId
    const unreadGroups = await prisma.personalChatMessage.groupBy({
      by: ['senderId'],
      where: {
        recipientId: String(userId),
        status: { not: 'read' },
      },
      _count: { _all: true },
    });

    const peers = {};
    for (const group of unreadGroups) {
      const peerId = group.senderId;
      const unreadCount = group._count?._all || 0;
      peers[peerId] = {
        unreadCount,
        lastTs: Date.now(),
        lastId: null,
        msgType: 'text',
      };
    }

    // 2. Fetch latest message per active conversation peer to get real timestamp and type
    if (Object.keys(peers).length > 0) {
      const peerIds = Object.keys(peers);
      const latestMsgs = await prisma.personalChatMessage.findMany({
        where: {
          recipientId: String(userId),
          senderId: { in: peerIds },
        },
        orderBy: { ts: 'desc' },
        distinct: ['senderId'],
      });
      for (const msg of latestMsgs) {
        if (peers[msg.senderId]) {
          peers[msg.senderId].lastTs = Number(msg.ts);
          peers[msg.senderId].lastId = msg.id;
        }
      }
    }

    // 3. Fetch event notifications
    const rawEventNotifs = await fetchCanonicalEventNotifications(userId);
    const ver = `${Date.now()}_canonical`;

    return { peers, rawEventNotifs, ver };
  } catch (err) {
    console.warn('[CanonicalStore] getCanonicalInboxSummary error:', err?.message);
    return { peers: {}, rawEventNotifs: [], ver: '0' };
  }
}

// ─── 4. Live GPS Presence & Graceful Offline ──────────────────────────────────
export async function recordCanonicalLivePresence(userId, lat, lng, district) {
  if (!userId || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  try {
    await prisma.userPresence.upsert({
      where: { userId: String(userId) },
      update: {
        lat: Number(lat),
        lng: Number(lng),
        district: district || null,
        updatedAt: new Date(),
      },
      create: {
        userId: String(userId),
        lat: Number(lat),
        lng: Number(lng),
        district: district || null,
      },
    });
  } catch (err) {
    console.warn('[CanonicalStore] recordCanonicalLivePresence error:', err?.message);
  }
}

export async function removeCanonicalLivePresence(userId) {
  if (!userId) return;
  try {
    await prisma.userPresence.deleteMany({
      where: { userId: String(userId) },
    });
  } catch {}
}

export async function getActiveCanonicalPresences(userIds = null) {
  try {
    const activeCutoff = new Date(Date.now() - PRESENCE_ACTIVE_WINDOW_MS);
    const where = {
      updatedAt: { gte: activeCutoff },
    };
    if (Array.isArray(userIds) && userIds.length > 0) {
      where.userId = { in: userIds.map(String) };
    }
    const rows = await prisma.userPresence.findMany({ where });
    const presenceMap = new Map();
    for (const r of rows) {
      presenceMap.set(r.userId, {
        userId: r.userId,
        lat: r.lat,
        lng: r.lng,
        district: r.district,
        timestamp: new Date(r.updatedAt).getTime(),
      });
    }
    return presenceMap;
  } catch (err) {
    console.warn('[CanonicalStore] getActiveCanonicalPresences error:', err?.message);
    return new Map();
  }
}

// ─── 5. Complete User Footprint Purge on Account Deletion ─────────────────────
export async function purgeCanonicalUserRecords(userId) {
  if (!userId) return;
  try {
    const uid = String(userId);
    await Promise.allSettled([
      prisma.callSignal.deleteMany({ where: { OR: [{ fromUserId: uid }, { toUserId: uid }] } }),
      prisma.callLock.deleteMany({ where: { OR: [{ userId: uid }, { callerId: uid }, { calleeId: uid }] } }),
      prisma.eventNotification.deleteMany({ where: { recipientId: uid } }),
      prisma.userPresence.deleteMany({ where: { userId: uid } }),
    ]);
  } catch {}
}
