import prisma from '../lib/prisma.js';
import {
  GROUP_ROLE_MAKER,
  GROUP_ROLE_COLLABORATOR,
  ensureMakerInGroup,
  getMemberRoleInEvent,
  listEnrichedGroupMembers,
  getEventGroupMeta,
  upsertEventGroupMeta,
  updateGroupMemberRole,
  kickGroupMemberAndPurgeParticipation,
  listGroupMessages,
  appendGroupMessage,
  markGroupChatRead,
  clearGroupChatForMe,
  deleteSelectedGroupMessages,
  getActiveEventGroupCall,
  startOrJoinEventGroupCall,
  leaveEventGroupCall,
  getUserGroupChatsSummary,
} from '../services/eventGroupStore.js';
import { generateLiveKitToken } from './personalChat/callSignalController.js';

async function resolveActiveEventAndMembership(eventId, userId) {
  if (!eventId || !userId) return { errorStatus: 400, error: 'Invalid event or user.' };
  const ev = await prisma.miniEvent.findFirst({
    where: { id: String(eventId), isActive: true, expiresAt: { gt: new Date() } },
    select: { id: true, title: true, creatorId: true },
  });
  if (!ev) return { errorStatus: 404, error: 'Active event not found.' };
  if (String(ev.creatorId) === String(userId)) {
    await ensureMakerInGroup(ev.id, ev.creatorId);
  }
  const role = await getMemberRoleInEvent(ev.id, userId, ev.creatorId);
  if (!role) return { errorStatus: 403, error: 'You are not a member of this event group.' };
  return { event: ev, role };
}

export async function getGroupChatsSummary(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const activeEvents = await prisma.miniEvent.findMany({
      where: { isActive: true, expiresAt: { gt: new Date() } },
      select: { id: true, title: true, creatorId: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const groups = await getUserGroupChatsSummary(userId, activeEvents);
    return res.json({ ok: true, groups });
  } catch (err) {
    return next(err);
  }
}

export async function getEventGroupMessages(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { eventId } = req.params;
    const check = await resolveActiveEventAndMembership(eventId, userId);
    if (check.error) return res.status(check.errorStatus).json({ error: check.error });

    const sinceTs = Number(req.query?.sinceTs || 0);
    const limit = Number(req.query?.limit || 60);
    const [messages, meta, members, activeCall] = await Promise.all([
      listGroupMessages({ eventId: check.event.id, userId, sinceTs, limit }),
      getEventGroupMeta(check.event.id),
      listEnrichedGroupMembers(check.event.id, check.event.creatorId),
      getActiveEventGroupCall(check.event.id),
    ]);

    return res.json({
      ok: true,
      eventId: check.event.id,
      role: check.role,
      meta,
      members,
      activeCall,
      messages,
    });
  } catch (err) {
    return next(err);
  }
}

export async function sendEventGroupMessage(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { eventId } = req.params;
    const check = await resolveActiveEventAndMembership(eventId, userId);
    if (check.error) return res.status(check.errorStatus).json({ error: check.error });

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { name: true, profilePicture: true },
    });

    const { id, type = 'text', text = '', mediaUrl = null, mediaType = null, duration = null, waveform = null, replyTo = null, ts = null } = req.body || {};
    const payload = {
      text: typeof text === 'string' ? text.slice(0, 4000) : '',
      ...(mediaUrl ? { mediaUrl: String(mediaUrl).slice(0, 2000) } : {}),
      ...(mediaType ? { mediaType: String(mediaType).slice(0, 32) } : {}),
      ...(Number.isFinite(Number(duration)) ? { duration: Number(duration) } : {}),
      ...(Array.isArray(waveform) ? { waveform: waveform.slice(0, 80) } : {}),
      ...(replyTo && typeof replyTo === 'object' ? { replyTo } : {}),
    };

    const message = await appendGroupMessage({
      eventId: check.event.id,
      senderId: userId,
      senderName: user?.name || req.user?.name || 'Kalcerian',
      senderAvatar: user?.profilePicture || null,
      msgType: type,
      payload,
      id,
      ts,
    });

    return res.json({ ok: true, message });
  } catch (err) {
    return next(err);
  }
}

export async function deleteEventGroupMessages(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { eventId } = req.params;
    const check = await resolveActiveEventAndMembership(eventId, userId);
    if (check.error) return res.status(check.errorStatus).json({ error: check.error });

    const { clearAll, messageIds } = req.body || {};
    if (clearAll) {
      const clearedAtMs = await clearGroupChatForMe(check.event.id, userId, Date.now());
      return res.json({ ok: true, cleared: true, clearedForMe: true, clearedAtMs });
    }
    const result = await deleteSelectedGroupMessages({
      eventId: check.event.id,
      actorId: userId,
      actorRole: check.role,
      messageIds,
    });
    return res.json({ ok: true, ...result });
  } catch (err) {
    return next(err);
  }
}

export async function ackEventGroupRead(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { eventId } = req.params;
    const check = await resolveActiveEventAndMembership(eventId, userId);
    if (check.error) return res.status(check.errorStatus).json({ error: check.error });
    const ts = await markGroupChatRead(check.event.id, userId, req.body?.readUpTo || Date.now());
    return res.json({ ok: true, lastReadTs: ts });
  } catch (err) {
    return next(err);
  }
}

export async function updateEventGroupSettings(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { eventId } = req.params;
    const check = await resolveActiveEventAndMembership(eventId, userId);
    if (check.error) return res.status(check.errorStatus).json({ error: check.error });
    if (check.role !== GROUP_ROLE_MAKER && check.role !== GROUP_ROLE_COLLABORATOR) {
      return res.status(403).json({ error: 'Only the maker or a collaborator can edit group settings.' });
    }
    const { avatarUrl, coverUrl, coverType, description } = req.body || {};
    const meta = await upsertEventGroupMeta(check.event.id, { avatarUrl, coverUrl, coverType, description });
    return res.json({ ok: true, meta });
  } catch (err) {
    return next(err);
  }
}

export async function promoteEventGroupMember(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { eventId, targetId } = req.params;
    const check = await resolveActiveEventAndMembership(eventId, userId);
    if (check.error) return res.status(check.errorStatus).json({ error: check.error });
    const { role = GROUP_ROLE_COLLABORATOR } = req.body || {};
    const result = await updateGroupMemberRole({
      eventId: check.event.id,
      creatorId: check.event.creatorId,
      actorId: userId,
      targetId,
      role,
    });
    const members = await listEnrichedGroupMembers(check.event.id, check.event.creatorId);
    return res.json({ ok: true, ...result, members });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

export async function kickEventGroupMember(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { eventId, targetId } = req.params;
    const check = await resolveActiveEventAndMembership(eventId, userId);
    if (check.error) return res.status(check.errorStatus).json({ error: check.error });
    const result = await kickGroupMemberAndPurgeParticipation({
      eventId: check.event.id,
      creatorId: check.event.creatorId,
      actorId: userId,
      targetId,
    });
    const members = await listEnrichedGroupMembers(check.event.id, check.event.creatorId);
    return res.json({ ok: true, ...result, members });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
}

export async function startEventGroupCall(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { eventId } = req.params;
    const check = await resolveActiveEventAndMembership(eventId, userId);
    if (check.error) return res.status(check.errorStatus).json({ error: check.error });

    const mode = req.body?.mode === 'video' ? 'video' : 'voice';
    const user = await prisma.user.findUnique({ where: { id: String(userId) }, select: { name: true } });
    const result = await startOrJoinEventGroupCall({
      eventId: check.event.id,
      userId,
      userName: user?.name || req.user?.name || 'Kalcerian',
      mode,
    });

    if (!result.ok && result.busy) {
      return res.status(409).json(result);
    }

    const livekit = generateLiveKitToken({
      userId,
      targetId: check.event.id,
      username: user?.name || req.user?.name || String(userId),
      callId: result.call.callId,
    });

    return res.json({ ok: true, ...result, livekit });
  } catch (err) {
    return next(err);
  }
}

export async function leaveEventGroupCallHandler(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { eventId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: String(userId) }, select: { name: true } });
    const result = await leaveEventGroupCall(eventId, userId, user?.name || 'Kalcerian');
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

