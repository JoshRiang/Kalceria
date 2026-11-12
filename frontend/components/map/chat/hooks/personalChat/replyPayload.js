/**
 * frontend/components/map/chat/hooks/personalChat/replyPayload.js
 *
 * Pure helper to build outbound reply payloads and inbound reply drafts.
 * Zero React dependencies, zero side-effects.
 *
 * Source: usePersonalChatState.js (L1047-L1070, L1288-L1319)
 */

export function buildReplyPayload(currentReply) {
  if (!currentReply) return null;
  return {
    id: currentReply.id,
    text: currentReply.text || '',
    msgType: currentReply.msgType,
    mediaUrl: currentReply.mediaUrl || null,
    voiceDuration: currentReply.voiceDuration || null,
    videoDuration: currentReply.videoDuration || null,
    caption: currentReply.caption || '',
    senderId: currentReply.senderId,
    senderName: currentReply.senderName || 'Kalcerian',
    isBroadcast: Boolean(currentReply.isBroadcast),
    broadcastMessage: currentReply.broadcastMessage || null,
    broadcastDuration: currentReply.broadcastDuration || null,
    lat: currentReply.lat || null,
    lng: currentReply.lng || null,
    userId: currentReply.userId || currentReply.senderId || null,
    isCall: Boolean(currentReply.isCall),
    callMode: currentReply.callMode || null,
    callDuration: currentReply.callDuration !== undefined ? currentReply.callDuration : null,
    callTimestamp: currentReply.callTimestamp || null,
    isEventMedia: Boolean(currentReply.isEventMedia),
    eventId: currentReply.eventId || null,
    clipId: currentReply.clipId || null,
    clipIndex: currentReply.clipIndex !== undefined ? currentReply.clipIndex : null,
    isVideo: Boolean(currentReply.isVideo),
    uploadedAt: currentReply.uploadedAt || currentReply.createdAt || null,
    expiresAt: currentReply.expiresAt || null,
  };
}

export function buildReplyDraft(msg, myId, activeChatUser, inferReplyMediaTypeFn) {
  if (!msg) return null;
  const senderName =
    String(msg.senderId) === String(myId)
      ? 'You'
      : activeChatUser?.displayName || activeChatUser?.name || 'Kalcerian';

  const mediaType = inferReplyMediaTypeFn ? inferReplyMediaTypeFn(msg) : msg.msgType;
  const voiceDuration = msg.voiceDuration || msg.duration || null;
  const videoDuration = msg.videoDuration || null;
  const isMedia = mediaType === 'photo' || mediaType === 'video';
  const caption = isMedia ? msg.text || '' : '';
  const isCall = mediaType === 'call' || msg.msgType === 'call';
  const callMode = msg.callMode || (msg.text?.toLowerCase().includes('video') ? 'video' : 'voice');
  const callDuration = msg.callDuration !== undefined ? msg.callDuration : null;
  const callTimestamp = msg.ts || msg.createdAt || Date.now();
  const isEventMedia = Boolean(msg.isEventMedia);
  const eventId = msg.eventId || null;
  const clipId = msg.clipId || null;
  const clipIndex = msg.clipIndex !== undefined ? msg.clipIndex : null;
  const isVideo = Boolean(msg.isVideo);

  return {
    id: msg.id,
    text: msg.text || '',
    msgType: mediaType,
    mediaUrl: msg.mediaUrl || null,
    voiceDuration,
    videoDuration,
    caption,
    senderId: msg.senderId,
    senderName,
    isCall,
    callMode,
    callDuration,
    callTimestamp,
    isEventMedia,
    eventId,
    clipId,
    clipIndex,
    isVideo,
    uploadedAt: msg.uploadedAt || msg.createdAt || null,
    expiresAt: msg.expiresAt || null,
  };
}

export function toEpochMs(val) {
  if (!val) return 0;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const num = Number(val);
  if (Number.isFinite(num) && num > 0) return num;
  const parsed = new Date(val).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveEventMediaQuoteStatus({
  replyTo,
  quoteInfo,
  events = [],
  now = Date.now(),
  clipTtlMs = 24 * 60 * 60 * 1000,
}) {
  const isEventMedia = Boolean(quoteInfo?.isEventMedia || replyTo?.isEventMedia);
  if (!isEventMedia) {
    return {
      isEventMedia: false,
      isMediaDeleted: false,
      activeMediaUrl: quoteInfo?.mediaUrl || replyTo?.mediaUrl || null,
      isVideo: Boolean(quoteInfo?.isVideo || replyTo?.isVideo),
      targetClipIndex: null,
    };
  }

  const evId = replyTo?.eventId || quoteInfo?.eventId;
  const clipId = replyTo?.clipId || quoteInfo?.clipId;
  const activeMediaUrl = quoteInfo?.mediaUrl || replyTo?.mediaUrl;

  const targetEvent = (events || []).find(
    (e) => String(e?.id) === String(evId) || String(e?.id) === String(evId).replace(/^event_/, '')
  );

  const eventClips = Array.isArray(targetEvent?.mediaItems)
    ? targetEvent.mediaItems
    : Array.isArray(targetEvent?.mediaUrls)
    ? targetEvent.mediaUrls.map((u) => ({ url: u }))
    : [];

  const foundClip = eventClips.find(
    (c) => (clipId && String(c?.id) === String(clipId)) || (activeMediaUrl && String(c?.url) === String(activeMediaUrl))
  );

  const clipUploadTs = toEpochMs(
    foundClip?.uploadedAt || replyTo?.uploadedAt || quoteInfo?.uploadedAt || targetEvent?.createdAt || replyTo?.createdAt
  );
  const clipExpireTs = toEpochMs(
    foundClip?.expiresAt || replyTo?.expiresAt || quoteInfo?.expiresAt
  );

  const is24hExpired =
    (clipExpireTs > 0 && now >= clipExpireTs) ||
    (clipUploadTs > 0 && now - clipUploadTs >= clipTtlMs);

  const isMediaDeleted = Boolean(!targetEvent || !foundClip || is24hExpired);

  const resolvedUrl = foundClip?.url || activeMediaUrl;
  const isVideo = Boolean(
    foundClip?.isVideo !== undefined ? foundClip.isVideo : (quoteInfo?.isVideo || replyTo?.isVideo)
  );
  const targetClipIndex = foundClip && eventClips.length > 0 ? eventClips.indexOf(foundClip) : null;

  return {
    isEventMedia: true,
    isMediaDeleted,
    activeMediaUrl: resolvedUrl,
    isVideo,
    targetClipIndex: isMediaDeleted ? null : targetClipIndex,
  };
}

