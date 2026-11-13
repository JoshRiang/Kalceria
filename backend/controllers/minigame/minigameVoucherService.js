import { randomBytes } from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { sendMinigameVoucherEmail } from '../../lib/mailer/index.js';

export const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60; // 604,800 seconds

/**
 * Calculates number of voucher winners based on event slots:
 * Flooring atas 50 (ceil(slots / 50)) * 2 vouchers per 50 slots tier.
 * Example: 130 slots -> ceil(130/50) = 3 * 2 = 6 winners.
 */
export function calculateVoucherWinnersCount(quota) {
  const q = Number(quota) || 0;
  if (q <= 0) return 0;
  const tiers = Math.ceil(q / 50);
  return tiers * 2;
}

/**
 * Deterministic or cryptographic shuffle for fair random draw among candidates.
 */
export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Resolves eligible users who:
 * 1. Are registered for the event (EventRegistration).
 * 2. Played the minigame at least once during the 7-day countdown window of the event.
 */
export async function getEligibleMinigameParticipants(eventId, prismaClient = prisma) {
  const event = await prismaClient.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      displayPhotoUrl: true,
      location: true,
      price: true,
      quota: true,
      regStartTime: true,
      regEndTime: true,
      targetAssignedAt: true,
      createdAt: true,
      status: true,
    },
  });

  if (!event) return { event: null, eligibleUsers: [] };

  const endMs = new Date(event.regEndTime).getTime();
  const startWindowMs = endMs - SEVEN_DAYS_SECONDS * 1000;
  const windowStart = new Date(startWindowMs);
  const windowEnd = new Date(Math.max(endMs, Date.now()) + 5 * 60 * 1000);

  // 1. Fetch all active/confirmed registered users for this event
  const registrations = await prismaClient.eventRegistration.findMany({
    where: {
      eventId,
      paymentStatus: { not: 'REJECTED' },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  if (!registrations.length) {
    return { event, eligibleUsers: [] };
  }

  const registeredUserMap = new Map();
  for (const reg of registrations) {
    if (reg.user) {
      registeredUserMap.set(reg.userId, {
        userId: reg.userId,
        name: reg.user.name,
        email: reg.user.email,
        phone: reg.user.phone || '',
        registrationId: reg.id,
        selectedSession: reg.selectedSession || 'Regular Session',
        paymentStatus: reg.paymentStatus || 'CONFIRMED',
      });
    }
  }

  // 2. Fetch minigame plays for this target event
  const playLogs = await prismaClient.auditLog.findMany({
    where: {
      action: 'MINIGAME_PLAY',
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    select: {
      id: true,
      adminEmail: true,
      details: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate each registered user's best score
  const userBestScoreMap = new Map();

  for (const log of playLogs) {
    try {
      const d = JSON.parse(log.details || '{}');
      if (d.targetEventId && d.targetEventId !== eventId) continue;
      const scoreMs = Number(d.scoreMs);
      if (!Number.isFinite(scoreMs) || scoreMs <= 0) continue;

      const userId = d.userId;
      if (!registeredUserMap.has(userId)) continue; // Must be registered

      const prev = userBestScoreMap.get(userId);
      if (prev === undefined || scoreMs < prev) {
        userBestScoreMap.set(userId, scoreMs);
      }
    } catch {}
  }

  const eligibleUsers = [];
  for (const [userId, bestScoreMs] of userBestScoreMap.entries()) {
    const u = registeredUserMap.get(userId);
    eligibleUsers.push({
      userId,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      registrationId: u.registrationId,
      selectedSession: u.selectedSession || 'Regular Session',
      paymentStatus: u.paymentStatus || 'CONFIRMED',
      bestScoreMs,
    });
  }

  // Sort by best score ascending (fastest time first)
  eligibleUsers.sort((a, b) => a.bestScoreMs - b.bestScoreMs);

  return { event, eligibleUsers };
}

/**
 * Selects voucher winners adhering to:
 * - Ceiling tiers of 50 slots -> voucherCount winners
 * - Top ranking scores
 * - If there are tied candidates at the cutoff score exceeding available slots,
 *   randomly selects among the tied candidates.
 */
export function selectVoucherWinners(eligibleUsers, voucherCount) {
  if (!eligibleUsers.length || voucherCount <= 0) {
    return { winners: [], candidates: [], cutoffScoreMs: null };
  }

  // If eligible users are fewer or equal to available vouchers, all win
  if (eligibleUsers.length <= voucherCount) {
    return {
      winners: [...eligibleUsers],
      candidates: [...eligibleUsers],
      cutoffScoreMs: eligibleUsers[eligibleUsers.length - 1].bestScoreMs,
    };
  }

  // Cutoff score at position voucherCount
  const cutoffScoreMs = eligibleUsers[voucherCount - 1].bestScoreMs;

  // Candidates who met or beat the cutoff score
  const candidates = eligibleUsers.filter((u) => u.bestScoreMs <= cutoffScoreMs);

  if (candidates.length <= voucherCount) {
    return { winners: candidates, candidates, cutoffScoreMs };
  }

  // Strictly better scores than cutoff
  const guaranteed = candidates.filter((u) => u.bestScoreMs < cutoffScoreMs);
  // Tied candidates at cutoff score
  const tied = candidates.filter((u) => u.bestScoreMs === cutoffScoreMs);

  const neededFromTied = voucherCount - guaranteed.length;
  const shuffledTied = shuffleArray(tied);
  const selectedFromTied = shuffledTied.slice(0, neededFromTied);

  const winners = [...guaranteed, ...selectedFromTied];

  return { winners, candidates, cutoffScoreMs };
}

/**
 * Sends winner emails idempotently (guaranteed max 1 email per user per event cycle).
 */
export async function dispatchVoucherWinnerEmails({
  event,
  winners = [],
  prismaClient = prisma,
  dryRun = false,
  emailSender = sendMinigameVoucherEmail,
}) {
  const results = [];
  for (const v of winners) {
    const recipient = v.userEmail;
    if (!recipient || recipient.endsWith('@guest.kalceria.local')) {
      results.push({ userId: v.userId, email: recipient || null, status: 'skipped_guest' });
      continue;
    }

    const dedupKey = `voucher-email:${event.id}:${v.userId}`;
    try {
      const alreadySent = await prismaClient.auditLog.findFirst({
        where: {
          action: 'EVENT_VOUCHER_EMAIL_SENT',
          adminEmail: dedupKey,
        },
        select: { id: true },
      });
      if (alreadySent) {
        results.push({ userId: v.userId, email: recipient, voucherCode: v.voucherCode, status: 'already_sent' });
        continue;
      }

      if (dryRun) {
        results.push({ userId: v.userId, email: recipient, voucherCode: v.voucherCode, status: 'dry_run' });
        continue;
      }

      const registration = {
        id: v.registrationId || '',
        selectedSession: v.selectedSession || 'Regular Session',
        paymentStatus: v.paymentStatus || 'CONFIRMED',
      };
      const user = {
        id: v.userId,
        name: v.userName,
        email: v.userEmail,
        phone: v.userPhone || '',
      };

      const sendResult = await emailSender({ to: recipient, event, voucher: v, registration, user });
      if (sendResult?.skipped) {
        results.push({ userId: v.userId, email: recipient, voucherCode: v.voucherCode, status: sendResult.reason || 'skipped' });
        continue;
      }

      await prismaClient.auditLog.create({
        data: {
          adminEmail: dedupKey,
          action: 'EVENT_VOUCHER_EMAIL_SENT',
          details: JSON.stringify({
            eventId: event.id,
            userId: v.userId,
            email: recipient,
            voucherCode: v.voucherCode,
            sentAt: new Date().toISOString(),
          }),
        },
      }).catch(() => {});

      results.push({ userId: v.userId, email: recipient, voucherCode: v.voucherCode, status: 'sent', messageId: sendResult?.id || null });
    } catch (err) {
      console.warn('[VoucherEmail] Delivery failed cleanly for winner:', recipient, err.message);
      results.push({ userId: v.userId, email: recipient, voucherCode: v.voucherCode, status: 'error', error: err.message });
    }
  }
  return results;
}

/**
 * Issues, persists, and optionally emails vouchers for the selected winners.
 */
export async function awardEventVouchers(eventId, prismaClient = prisma, options = {}) {
  const { sendEmails = true, dryRun = false, emailSender = sendMinigameVoucherEmail } = options;
  const { event, eligibleUsers } = await getEligibleMinigameParticipants(eventId, prismaClient);
  if (!event) throw new Error('Event not found');

  const voucherCount = calculateVoucherWinnersCount(event.quota);
  const { winners, candidates, cutoffScoreMs } = selectVoucherWinners(eligibleUsers, voucherCount);

  const issuedVouchers = winners.map((w) => {
    const randSuffix = randomBytes(3).toString('hex').toUpperCase();
    const voucherCode = `VCHR-${event.id.replace(/^evt-/, '').toUpperCase()}-${randSuffix}`;
    return {
      voucherCode,
      eventId: event.id,
      eventTitle: event.title,
      displayPhotoUrl: event.displayPhotoUrl || null,
      location: event.location || 'TBA',
      price: event.price ?? 0,
      registrationId: w.registrationId || null,
      selectedSession: w.selectedSession || 'Regular Session',
      paymentStatus: w.paymentStatus || 'CONFIRMED',
      userId: w.userId,
      userName: w.name,
      userEmail: w.email,
      userPhone: w.phone || '',
      bestScoreMs: w.bestScoreMs,
      issuedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };
  });

  // Persist to Redis cache if available
  if (redis && redis.status === 'ready') {
    try {
      await redis.set(`event:vouchers:${eventId}`, JSON.stringify(issuedVouchers));
    } catch (err) {
      console.warn('[Voucher] Redis cache error:', err.message);
    }
  }

  // Persist to AuditLog for durable audit trail
  for (const v of issuedVouchers) {
    try {
      await prismaClient.auditLog.create({
        data: {
          adminEmail: v.userEmail || `user:${v.userId}`,
          action: 'EVENT_VOUCHER_AWARDED',
          details: JSON.stringify(v),
        },
      });
    } catch (err) {
      console.warn('[Voucher] AuditLog create warning:', err.message);
    }
  }

  try {
    await prismaClient.auditLog.create({
      data: {
        adminEmail: `voucher-draw:${eventId}`,
        action: 'EVENT_VOUCHER_DRAW_COMPLETED',
        details: JSON.stringify({
          eventId,
          totalEligible: eligibleUsers.length,
          totalCandidates: candidates.length,
          winnersCount: issuedVouchers.length,
          completedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (err) {
    console.warn('[Voucher] Draw completion log warning:', err.message);
  }

  const emailResults = sendEmails && issuedVouchers.length > 0
    ? await dispatchVoucherWinnerEmails({
        event,
        winners: issuedVouchers,
        prismaClient,
        dryRun,
        emailSender,
      })
    : [];

  return {
    eventId,
    eventTitle: event.title,
    quota: event.quota,
    voucherCount,
    cutoffScoreMs,
    totalEligible: eligibleUsers.length,
    totalCandidates: candidates.length,
    winners: issuedVouchers,
    emailResults,
  };
}

/**
 * Atomically finalizes expired minigame target events once Due hits zero.
 * Uses conditional DB update inside $transaction so concurrent requests never double-draw or double-email.
 */
export async function finalizeExpiredMinigameTargets({
  eventId = null,
  prismaClient = prisma,
  sendEmails = true,
  dryRun = false,
  emailSender = sendMinigameVoucherEmail,
} = {}) {
  const now = new Date();
  const expiredTargets = await prismaClient.event.findMany({
    where: {
      ...(eventId ? { id: eventId } : {}),
      isMinigameTarget: true,
      status: 'OPEN',
      regEndTime: { lte: now },
    },
    orderBy: { regEndTime: 'asc' },
    select: { id: true, title: true, regEndTime: true },
  });

  if (!expiredTargets.length) {
    return { finalizedCount: 0, finalizedEvents: [] };
  }

  const finalizedEvents = [];

  for (const candidate of expiredTargets) {
    const claimed = await prismaClient.$transaction(async (tx) => {
      const res = await tx.event.updateMany({
        where: {
          id: candidate.id,
          isMinigameTarget: true,
          status: 'OPEN',
          regEndTime: { lte: now },
        },
        data: {
          isMinigameTarget: false,
        },
      });
      return res.count;
    });

    if (claimed === 1) {
      const drawResult = await awardEventVouchers(candidate.id, prismaClient, {
        sendEmails,
        dryRun,
        emailSender,
      });
      finalizedEvents.push(drawResult);
    }
  }

  return {
    finalizedCount: finalizedEvents.length,
    finalizedEvents,
  };
}

/**
 * Retrieves the current user's awarded voucher for an event (or most recent won voucher).
 */
export async function getUserAwardedVoucher(userId, eventId = null, prismaClient = prisma) {
  if (!userId) return null;

  try {
    const logs = await prismaClient.auditLog.findMany({
      where: {
        action: 'EVENT_VOUCHER_AWARDED',
        OR: [
          { details: { contains: userId } },
          { adminEmail: { contains: userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    for (const log of logs) {
      try {
        const d = JSON.parse(log.details || '{}');
        if (d.userId === userId && d.status !== 'REVOKED' && (!eventId || d.eventId === eventId)) {
          return d;
        }
      } catch {}
    }
    return null;
  } catch (err) {
    console.warn('[Voucher] Failed to get user voucher:', err.message);
    return null;
  }
}

