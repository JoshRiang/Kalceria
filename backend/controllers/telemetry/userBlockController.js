import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { getChatRtcSignalKey } from '../personalChat/chatConstants.js';
import { invalidateMiniEventsCache } from '../miniEvent/index.js';
import { isValidTargetId } from './telemetryUtils.js';

export async function getBlockedUsers(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.json({ blockedUsers: [], blockedByUsers: [] });
    const cleanUserId = String(userId).trim();
    const [blocked, blockedBy] = await Promise.all([
      redis.smembers("blocked:" + cleanUserId).catch(() => []),
      redis.smembers("blocked_by:" + cleanUserId).catch(() => []),
    ]);
    res.json({
      blockedUsers: Array.isArray(blocked) ? blocked.map(String) : [],
      blockedByUsers: Array.isArray(blockedBy) ? blockedBy.map(String) : [],
    });
  } catch (err) {
    next(err);
  }
}

export async function blockUser(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { targetId } = req.params;
    if (!isValidTargetId(targetId, userId)) {
      return res.status(400).json({ error: "Invalid target user id." });
    }
    const cleanUserId = String(userId).trim();
    const cleanTargetId = String(targetId).trim();

    await Promise.all([
      redis.sadd("blocked:" + cleanUserId, cleanTargetId),
      redis.sadd("blocked_by:" + cleanTargetId, cleanUserId),
      redis.del(getChatRtcSignalKey(cleanUserId, cleanTargetId)).catch(() => {}),
      redis.del(getChatRtcSignalKey(cleanTargetId, cleanUserId)).catch(() => {}),
    ]);

    // Auto-kick blocked target user from any active events created by the blocker
    if (prisma?.miniEvent) {
      try {
        const myActiveEvents = await prisma.miniEvent.findMany({
          where: { creatorId: String(userId), isActive: true },
          select: { id: true, description: true },
        });

        for (const ev of myActiveEvents) {
          // 1. Remove from accepted collaborator Redis set
          await redis.srem(`mini_event:collab:accepted:${ev.id}`, String(targetId)).catch(() => {});

          // 2. Remove from [COLLABS:...] tag in event description if present
          if (ev.description && /\[COLLABS:[^\]]+\]/i.test(ev.description)) {
            const match = ev.description.match(/\[COLLABS:([^\]]+)\]/i);
            if (match) {
              const collabs = match[1].split(',').map((s) => s.trim()).filter(Boolean);
              if (collabs.includes(String(targetId))) {
                const remaining = collabs.filter((c) => c !== String(targetId));
                let newDesc;
                if (remaining.length === 0) {
                  newDesc = ev.description.replace(/\[COLLABS:[^\]]+\]\s*/gi, '').trim();
                } else {
                  newDesc = ev.description.replace(/\[COLLABS:[^\]]+\]/gi, `[COLLABS:${remaining.join(', ')}]`);
                }
                await prisma.miniEvent.update({
                  where: { id: ev.id },
                  data: { description: newDesc },
                }).catch(() => {});
              }
            }
          }

          // 3. Remove from pending requests for this event
          try {
            const rawReqs = await redis.get(`mini_event:collab:requests:${ev.id}`);
            if (rawReqs) {
              const parsed = JSON.parse(rawReqs);
              if (Array.isArray(parsed)) {
                const filtered = parsed.filter((r) => String(r.userId) !== String(targetId));
                if (filtered.length === 0) {
                  await redis.del(`mini_event:collab:requests:${ev.id}`);
                } else if (filtered.length !== parsed.length) {
                  await redis.set(`mini_event:collab:requests:${ev.id}`, JSON.stringify(filtered));
                }
              }
            }
          } catch {}

          // 4. Clear user_request pointer for targetId if pointing to this event
          try {
            const rawUserReq = await redis.get(`mini_event:collab:user_request:${targetId}`);
            if (rawUserReq) {
              const parsedUserReq = JSON.parse(rawUserReq);
              if (String(parsedUserReq?.eventId) === String(ev.id)) {
                await redis.del(`mini_event:collab:user_request:${targetId}`);
              }
            }
          } catch {}
        }

        if (myActiveEvents.length > 0) {
          await invalidateMiniEventsCache().catch(() => {});
        }
      } catch (collabErr) {
        console.error('[blockUser] Error auto-kicking target from events:', collabErr);
      }
    }

    res.json({ ok: true, blockedUserId: targetId });
  } catch (err) {
    next(err);
  }
}

export async function unblockUser(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { targetId } = req.params;
    if (!isValidTargetId(targetId)) {
      return res.status(400).json({ error: "Invalid target user id." });
    }
    const cleanUserId = String(userId).trim();
    const cleanTargetId = String(targetId).trim();

    await Promise.all([
      redis.srem("blocked:" + cleanUserId, cleanTargetId),
      redis.srem("blocked_by:" + cleanTargetId, cleanUserId),
    ]);
    res.json({ ok: true, unblockedUserId: cleanTargetId });
  } catch (err) {
    next(err);
  }
}

