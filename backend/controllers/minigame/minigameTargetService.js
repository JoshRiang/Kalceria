import prisma from '../../lib/prisma.js';

export const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60; // 604,800 seconds

/**
 * Resolves the currently active minigame target event.
 * An event is an active target if:
 * 1. isMinigameTarget is true
 * 2. status is OPEN
 * 3. current time < regEndTime (registration close date has not yet passed)
 *
 * If regEndTime has passed, the target duration has ended ("WAKTU ASSIGN BERAKHIR"),
 * so active target is null and scores reset.
 */
export async function getActiveMinigameTargetEvent(prismaClient = prisma) {
  try {
    const event = await prismaClient.event.findFirst({
      where: {
        isMinigameTarget: true,
        status: 'OPEN',
      },
    });

    if (!event) return null;

    const now = Date.now();
    const endMs = new Date(event.regEndTime).getTime();

    // If registration closing date has already arrived or passed, target assign has ended
    if (!Number.isFinite(endMs) || endMs <= now) {
      return null;
    }

    const secondsUntilDue = Math.max(0, Math.floor((endMs - now) / 1000));
    const isWithin7Days = secondsUntilDue <= SEVEN_DAYS_SECONDS && secondsUntilDue > 0;

    return {
      ...event,
      isTarget: true,
      endMs,
      secondsUntilDue,
      isWithin7Days,
    };
  } catch (err) {
    console.warn('[MinigameTargetService] Failed to resolve active target event:', err.message);
    return null;
  }
}

/**
 * Formats public target event information for API responses and Minigame HUD.
 */
export async function getMinigameTargetInfo(prismaClient = prisma) {
  const activeTarget = await getActiveMinigameTargetEvent(prismaClient);

  if (!activeTarget) {
    return {
      hasTarget: false,
      id: null,
      title: null,
      regEndTime: null,
      secondsUntilDue: null,
      isWithin7Days: false,
      dueStatus: 'NOT_STARTED',
    };
  }

  return {
    hasTarget: true,
    id: activeTarget.id,
    title: activeTarget.title,
    regEndTime: activeTarget.regEndTime.toISOString(),
    secondsUntilDue: activeTarget.secondsUntilDue,
    isWithin7Days: activeTarget.isWithin7Days,
    dueStatus: activeTarget.isWithin7Days ? 'COUNTDOWN' : 'NOT_STARTED',
  };
}

/**
 * Computes user minigame statistics scoped strictly to the active target event cycle.
 * If there is no active target (not assigned, replaced, or expired), all users inherit
 * the default best score (null).
 */
export async function getUserTargetStats(userId, userEmail, activeTarget, dateStr, prismaClient = prisma) {
  const defaultStats = { bestScoreMs: null, todayScoreMs: null, totalPlays: 0 };
  if (!userId || !activeTarget) {
    return defaultStats;
  }

  try {
    const emailLookup = userEmail || `user:${userId}`;
    const assignedTimestamp = activeTarget.targetAssignedAt
      ? new Date(activeTarget.targetAssignedAt)
      : new Date(activeTarget.createdAt);

    const logs = await prismaClient.auditLog.findMany({
      where: {
        adminEmail: { in: [emailLookup, `user:${userId}`] },
        action: 'MINIGAME_PLAY',
        createdAt: { gte: assignedTimestamp },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let bestMs = Infinity;
    let todayMs = null;
    let targetPlays = 0;

    for (const log of logs) {
      try {
        const d = JSON.parse(log.details || '{}');
        // Only count plays that were saved for this target event
        if (d.targetEventId === activeTarget.id) {
          targetPlays++;
          if (d.date === dateStr && Number.isFinite(d.scoreMs) && todayMs === null) {
            todayMs = d.scoreMs;
          }
          if (Number.isFinite(d.scoreMs) && d.scoreMs < bestMs) {
            bestMs = d.scoreMs;
          }
        }
      } catch {}
    }

    return {
      bestScoreMs: bestMs !== Infinity ? bestMs : null,
      todayScoreMs: todayMs,
      totalPlays: targetPlays,
    };
  } catch (err) {
    console.warn('[MinigameTargetService] Failed to compute user target stats:', err.message);
    return defaultStats;
  }
}
