import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import {
  hydrateAndPruneEventMedia,
  purgeEventMediaByIds,
  saveEventMediaItems,
  syncEventDescriptionMedia,
} from '../miniEvent/eventMediaStore.js';
import {
  purgeEventCollabByIds,
  removeUserFromAllEventCollabs,
} from '../miniEvent/eventCollabStore.js';

export async function cleanupUserDatabaseRecords(tx, userId) {
  const ownedEvents = await tx.miniEvent.findMany({
    where: { creatorId: userId },
    select: { id: true },
  });
  const ownedEventIds = ownedEvents.map((e) => e.id);

  await Promise.all([
    tx.userBroadcast.deleteMany({ where: { userId } }),
    tx.eventRegistration.deleteMany({ where: { userId } }),
    tx.miniEvent.deleteMany({ where: { creatorId: userId } }),
    tx.booking.deleteMany({ where: { userId } }),
    tx.comment.deleteMany({ where: { userId } }),
    tx.personalChatMessage.deleteMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    }),
    tx.callSignal.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } }),
    tx.callLock.deleteMany({ where: { OR: [{ userId }, { callerId: userId }, { calleeId: userId }] } }),
    tx.eventNotification.deleteMany({ where: { recipientId: userId } }),
    tx.userPresence.deleteMany({ where: { userId } }),
  ]);

  const userBookings = await tx.serviceBooking.findMany({
    where: { requestorId: userId },
    select: { id: true },
  });
  if (userBookings.length > 0) {
    const bookingIds = userBookings.map((b) => b.id);
    await tx.serviceBookingSlot.deleteMany({
      where: { serviceBookingId: { in: bookingIds } },
    });
  }
  await tx.serviceBooking.deleteMany({ where: { requestorId: userId } });
  await tx.user.delete({ where: { id: userId } });

  return { ownedEventIds };
}

export async function purgeUserRedisFootprint(userId, email = '', ownedEventIds = []) {
  const rawEmail = String(email || '');
  const normEmail = rawEmail.toLowerCase().trim();

  let remainingActiveEvents = [];
  try {
    remainingActiveEvents = await prisma.miniEvent.findMany({
      where: { isActive: true },
      select: { id: true, description: true, creatorId: true, createdAt: true },
    });
  } catch {
    remainingActiveEvents = [];
  }

  // Remove collaborator memberships, pending collab requests, and clips authored by deleted user
  await Promise.allSettled([
    purgeEventMediaByIds(ownedEventIds),
    purgeEventCollabByIds(ownedEventIds),
    removeUserFromAllEventCollabs(userId, remainingActiveEvents),
    ...remainingActiveEvents.map(async (ev) => {
      const hydrated = await hydrateAndPruneEventMedia(ev);
      const filtered = hydrated.mediaItems.filter(
        (clip) => !clip.authorId || String(clip.authorId) !== String(userId)
      );
      if (filtered.length !== hydrated.mediaItems.length) {
        await saveEventMediaItems(ev.id, filtered);
        await syncEventDescriptionMedia(ev, filtered.map((c) => c.url));
      }
    }),
  ]);

  const redisDeletes = [
    redis.zrem('active_users', userId),
    redis.del(`live:user:${userId}`),
    redis.del(`live:cooldown:${userId}`),
    redis.del(`telemetry:${userId}`),
    redis.del(`blocked:${userId}`),
    redis.del(`favourites:${userId}`),
    redis.del(`muted:${userId}`),
    redis.del(`chat:call:${userId}`),
    redis.del(`chat:inbox_ver:${userId}`),
    redis.del(`chat:unread:${userId}`),
    redis.del(`chat:inbox:${userId}`),
    redis.del(`chat:signals:${userId}`),
    redis.del(`user:profile_meta:${userId}`),
    redis.del(`comment_cooldown:${userId}`),
    redis.del(`minigame_attempt:${userId}`),
    redis.del(`mini_event:collab:user_request:${userId}`),
    redis.del('cache:all_kalcerians'),
    redis.del('cache:map_users_enriched'),
    redis.del('cache:map_users:global'),
    redis.del('cache:public_bookings'),
  ];

  if (rawEmail) {
    redisDeletes.push(redis.del(`reset_status:${rawEmail}`));
  }
  if (normEmail) {
    redisDeletes.push(
      redis.del(`reset_status:${normEmail}`),
      redis.del(`otp:${normEmail}`),
      redis.del(`pending:register:${normEmail}`),
      redis.del(`pending:verified:${normEmail}`),
      redis.del(`reset_from_map_email:${normEmail}`)
    );
  }

  await Promise.allSettled(redisDeletes);
}

