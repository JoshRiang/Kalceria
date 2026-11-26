/**
 * Pure formatting helpers for Instagram DM-style last-message previews
 * in the "Chat with Others" panel. Zero @/ alias or React imports.
 */

export function truncatePreviewText(text, maxLen = 30) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen).trimEnd()}...`;
}

export function formatLastMessagePreview(entry = null, localMsg = null, maxLen = 30) {
  const entryTs = Number(entry?.lastMessageAt || 0);
  const localTs = Number(localMsg?.ts || localMsg?.timestamp || 0);
  const useLocal = Boolean(localMsg && localTs >= entryTs);

  if (useLocal) {
    const msgType = String(localMsg.type || localMsg.msgType || "").toLowerCase();
    const mediaType = String(localMsg.mediaType || "").toLowerCase();
    const rawText = String(localMsg.text || localMsg.message || "").trim();

    if (msgType === "call" || localMsg.callLog) {
      const mode = String(localMsg.callMode || localMsg.callLog?.mode || "").toLowerCase();
      if (mode === "video") return "Video call ended";
      if (mode === "voice") return "Voice call ended";
      return "Call ended";
    }
    if (msgType === "voice" || msgType === "audio") return "Voice message";
    if (msgType === "video" || mediaType === "video") return "Video";
    if (msgType === "photo" || msgType === "image" || mediaType === "image" || msgType === "media") {
      return "Photo";
    }
    if (localMsg.replyTo) {
      const snippet = truncatePreviewText(rawText || "Message", Math.max(12, maxLen - 9));
      return `Replied: ${snippet}`;
    }
    if (rawText) return truncatePreviewText(rawText, maxLen);
  }

  const text = String(entry?.lastMessageText || "").trim();
  if (!text) return "Tap to start chatting";

  const lower = text.toLowerCase();
  if (lower.includes("video call")) return "Video call ended";
  if (lower.includes("voice call")) return "Voice call ended";
  if (lower.includes("panggilan") || lower.includes("call ended")) return "Call ended";
  if (lower.includes("voice note") || lower.includes("voice message")) return "Voice message";
  if (lower.includes("video")) return "Video";
  if (lower.includes("photo") || lower.includes("foto") || lower.includes("media")) return "Photo";
  if (lower.startsWith("replied:")) return truncatePreviewText(text, maxLen);

  return truncatePreviewText(text, maxLen);
}

export function readQuickLocalLastMessage(myId, peerId, storage = null) {
  const store = storage || (typeof sessionStorage !== "undefined" ? sessionStorage : null);
  if (!store || !myId || !peerId) return null;
  try {
    const raw = store.getItem(`quick_kalceria_chat_${myId}_${peerId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.messages) ? parsed.messages : [];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const m = list[i];
      if (m && !m.deleted) return m;
    }
    return null;
  } catch {
    return null;
  }
}
