import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { resolveClientFingerprint } from '../middleware/ingressDefense.js';
import { CANONICAL_USER_SELECT } from '../utils/profileDefaults.js';
import {
  getActiveMinigameTargetEvent,
  getMinigameTargetInfo,
  getUserTargetStats,
} from './minigame/minigameTargetService.js';
import {
  finalizeExpiredMinigameTargets,
  getUserAwardedVoucher,
} from './minigame/minigameVoucherService.js';

// Fallback in-memory store for environments without active Redis
const minigameMemStore = new Map();

function getMemAttempt(key) {
  const item = minigameMemStore.get(key);
  if (!item) return false;
  if (Date.now() > item.expiry) {
    minigameMemStore.delete(key);
    return false;
  }
  return true;
}

function setMemAttempt(key, ttlSeconds) {
  minigameMemStore.set(key, { expiry: Date.now() + ttlSeconds * 1000 });
}

export function clearMinigameMemStoreForTesting() {
  minigameMemStore.clear();
}

export function getWibDateInfo() {
  const now = new Date();
  const wibFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = wibFormatter.format(now); // YYYY-MM-DD

  // Calculate milliseconds until midnight in Asia/Jakarta
  const nowWib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const midnightWib = new Date(nowWib);
  midnightWib.setHours(24, 0, 0, 0);
  const secondsUntilReset = Math.max(1, Math.floor((midnightWib - nowWib) / 1000));

  // Start of day in UTC equivalent for Postgres queries
  const startOfDayWib = new Date(`${dateStr}T00:00:00+07:00`);

  return { dateStr, secondsUntilReset, startOfDayWib };
}

async function isAttemptUsed(req, userId, userEmail) {
  const { dateStr, secondsUntilReset, startOfDayWib } = getWibDateInfo();
  const { machineTag, fingerprint } = resolveClientFingerprint(req);

  const keysToCheck = [];
  if (userId) {
    keysToCheck.push(`minigame:attempt:user:${userId}:${dateStr}`);
  }
  keysToCheck.push(`minigame:attempt:fp:${fingerprint}:${dateStr}`);
  if (machineTag) {
    keysToCheck.push(`minigame:attempt:tag:${machineTag}:${dateStr}`);
  }

  // 1. In-memory check
  for (const k of keysToCheck) {
    if (getMemAttempt(k)) return true;
  }

  // 2. Redis check
  if (redis && redis.status === 'ready') {
    try {
      for (const k of keysToCheck) {
        const val = await redis.get(k);
        if (val) return true;
      }
    } catch (err) {
      console.warn('[Minigame] Redis check warning:', err.message);
    }
  }

  // 3. Persistent Database Check (Prisma AuditLog)
  if (userId) {
    try {
      const emailLookup = userEmail || `user:${userId}`;
      const existingPlay = await prisma.auditLog.findFirst({
        where: {
          adminEmail: { in: [emailLookup, `user:${userId}`] },
          action: 'MINIGAME_PLAY',
          createdAt: { gte: startOfDayWib },
        },
        select: { id: true },
      });

      if (existingPlay) {
        // Heal / repopulate Redis & memStore
        for (const k of keysToCheck) {
          setMemAttempt(k, secondsUntilReset);
        }
        if (redis && redis.status === 'ready') {
          for (const k of keysToCheck) {
            await redis.set(k, '1', 'EX', secondsUntilReset).catch(() => {});
          }
        }
        return true;
      }
    } catch (err) {
      console.warn('[Minigame] Database check warning:', err.message);
    }
  }

  return false;
}

export async function getMinigameStatus(req, res, next) {
  try {
    await finalizeExpiredMinigameTargets().catch((err) => {
      console.warn('[Minigame Status] Auto-finalize warning:', err.message);
    });

    const userId = req.user?.userId || null;
    const userEmail = req.user?.email || null;
    const { dateStr, secondsUntilReset } = getWibDateInfo();
    const used = await isAttemptUsed(req, userId, userEmail);
    const remaining = used ? 0 : 1;

    const targetInfo = await getMinigameTargetInfo();
    const activeTarget = await getActiveMinigameTargetEvent();
    const userStats = await getUserTargetStats(userId, userEmail, activeTarget, dateStr);
    const userVoucher = userId ? await getUserAwardedVoucher(userId, activeTarget?.id) : null;

    res.json({
      success: true,
      attempt: remaining,
      canPlay: remaining > 0 && Boolean(activeTarget?.isWithin7Days),
      hasPlayedToday: used,
      maxDailyAttempts: 1,
      secondsUntilReset,
      stats: userStats,
      targetEvent: targetInfo,
      voucher: userVoucher,
    });
  } catch (err) {
    console.error('[Minigame Status Error]', err);
    next(err);
  }
}

export async function recordMinigameScore(req, res, next) {
  try {
    const userId = req.user?.userId;
    let userEmail = req.user?.email || null;
    if (!userId) {
      return res.status(401).json({
        error: 'Please sign in to play the minigame and record your daily score.',
      });
    }

    const activeTarget = await getActiveMinigameTargetEvent();
    if (!activeTarget || !activeTarget.isWithin7Days) {
      return res.status(403).json({
        error: 'Minigame challenge is only accessible while the target event Due countdown is active.',
      });
    }

    if (!userEmail) {
      try {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: CANONICAL_USER_SELECT,
        });
        if (u?.email) userEmail = u.email;
      } catch {}
    }
    userEmail = userEmail || `user:${userId}`;

    const { dateStr, secondsUntilReset } = getWibDateInfo();
    const used = await isAttemptUsed(req, userId, userEmail);
    if (used) {
      return res.status(429).json({
        error: 'Daily attempt already used. Registered users are granted 1 attempt daily. Next attempt unlocks at midnight WIB.',
        retryAfter: secondsUntilReset,
      });
    }

    const { ms, seed, skipped } = req.body || {};
    const scoreMs = Number(ms);
    if (!skipped && (!Number.isFinite(scoreMs) || scoreMs < 1000 || scoreMs > 600000)) {
      return res.status(400).json({ error: 'Valid game score duration is required.' });
    }

    const { machineTag, fingerprint } = resolveClientFingerprint(req);
    const keys = [
      `minigame:attempt:user:${userId}:${dateStr}`,
      `minigame:attempt:fp:${fingerprint}:${dateStr}`,
    ];
    if (machineTag) keys.push(`minigame:attempt:tag:${machineTag}:${dateStr}`);

    // Persist to memory store
    for (const k of keys) {
      setMemAttempt(k, secondsUntilReset);
    }

    // Persist to Redis with exact TTL until midnight WIB
    if (redis && redis.status === 'ready') {
      try {
        for (const k of keys) {
          await redis.set(k, '1', 'EX', secondsUntilReset);
        }
      } catch (err) {
        console.warn('[Minigame] Redis write error:', err.message);
      }
    }

    const targetEventId = activeTarget ? activeTarget.id : null;
    const targetAssignedAt = activeTarget?.targetAssignedAt
      ? new Date(activeTarget.targetAssignedAt).toISOString()
      : null;

    // Persist to Database AuditLog for 100% durable audit trail
    try {
      await prisma.auditLog.create({
        data: {
          adminEmail: userEmail,
          action: 'MINIGAME_PLAY',
          details: JSON.stringify({
            userId,
            scoreMs: skipped ? null : scoreMs,
            seed: typeof seed === 'string' || typeof seed === 'number' ? String(seed) : '',
            date: dateStr,
            skipped: Boolean(skipped),
            targetEventId,
            targetAssignedAt,
            completedAt: new Date().toISOString(),
          }),
        },
      });
    } catch (dbErr) {
      console.warn('[Minigame] AuditLog create warning:', dbErr.message);
    }

    const targetInfo = await getMinigameTargetInfo();

    res.status(201).json({
      success: true,
      attempt: 0,
      hasPlayedToday: true,
      message: 'Minigame score recorded successfully.',
      secondsUntilReset,
      targetEvent: targetInfo,
    });
  } catch (err) {
    console.error('[Minigame Score Error]', err);
    next(err);
  }
}

export async function getMyMinigameVoucher(req, res, next) {
  try {
    await finalizeExpiredMinigameTargets().catch(() => {});
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Please sign in.' });
    const activeTarget = await getActiveMinigameTargetEvent();
    const voucher = await getUserAwardedVoucher(userId, activeTarget?.id || null);
    res.json({ success: true, voucher });
  } catch (err) {
    next(err);
  }
}

export async function finalizeMinigameChallenge(req, res, next) {
  try {
    const requestedEventId = typeof req.body?.eventId === 'string' && req.body.eventId.trim()
      ? req.body.eventId.trim()
      : null;

    const finalization = await finalizeExpiredMinigameTargets({
      eventId: requestedEventId,
      sendEmails: true,
    });

    const userId = req.user?.userId || null;
    const activeTarget = await getActiveMinigameTargetEvent();
    const targetInfo = await getMinigameTargetInfo();
    const userVoucher = userId
      ? await getUserAwardedVoucher(userId, requestedEventId || activeTarget?.id || null)
      : null;

    res.json({
      success: true,
      finalizedCount: finalization.finalizedCount,
      targetEvent: targetInfo,
      voucher: userVoucher,
    });
  } catch (err) {
    console.error('[Minigame Finalize Error]', err);
    next(err);
  }
}
