import {
  getMyActiveBlends,
  getGroupBlendState,
  inviteGroupBlend,
  joinGroupBlend,
  leaveGroupBlend,
  updateGroupBlendMemberState,
} from '../services/groupBlendStore.js';

export async function getMyActiveBlendsHandler(req, res, next) {
  try {
    const result = await getMyActiveBlends(req.user.userId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getGroupBlendHandler(req, res, next) {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return res.status(400).json({ error: 'Event ID is required.' });
    const includeRoutes = String(req.query.routes ?? 'true') !== 'false';
    const result = await getGroupBlendState({ eventId, viewerId: req.user.userId, includeRoutes });
    if (result?.forbidden) return res.status(403).json({ error: 'You must be in this event group chat.' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function inviteGroupBlendHandler(req, res, next) {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return res.status(400).json({ error: 'Event ID is required.' });
    const result = await inviteGroupBlend({
      eventId,
      userId: req.user.userId,
      initialPos: req.body || null,
    });
    if (result?.forbidden) return res.status(403).json({ error: 'You must be in this event group chat.' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function joinGroupBlendHandler(req, res, next) {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return res.status(400).json({ error: 'Event ID is required.' });
    const result = await joinGroupBlend({
      eventId,
      userId: req.user.userId,
      transportMode: req.body?.transportMode || 'foot',
      position: req.body || null,
    });
    if (result?.forbidden) return res.status(403).json({ error: 'You must be in this event group chat.' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function leaveGroupBlendHandler(req, res, next) {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return res.status(400).json({ error: 'Event ID is required.' });
    const result = await leaveGroupBlend({ eventId, userId: req.user.userId });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function updateGroupBlendStateHandler(req, res, next) {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return res.status(400).json({ error: 'Event ID is required.' });
    const result = await updateGroupBlendMemberState({
      eventId,
      userId: req.user.userId,
      transportMode: req.body?.transportMode,
      lat: req.body?.lat,
      lng: req.body?.lng,
      accuracy: req.body?.accuracy,
      heading: req.body?.heading,
      speed: req.body?.speed,
      isStationary: req.body?.isStationary,
    });
    if (result?.forbidden) return res.status(403).json({ error: 'You must be in this event group chat.' });
    if (result?.notJoined) return res.status(403).json({ error: 'Join Location Blend first.' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

