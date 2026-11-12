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
  };
}

