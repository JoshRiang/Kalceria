"use client";

/**
 * Format seconds into mm:ss (e.g. 7 -> "00:07", 65 -> "01:05")
 */
export function formatVoiceDuration(sec) {
  if (typeof sec === "string" && /^\d{1,2}:\d{2}$/.test(sec.trim())) {
    const parts = sec.trim().split(":");
    return `${parts[0].padStart(2, "0")}:${parts[1]}`;
  }
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${String(m).padStart(2, "0")}:${String(remS).padStart(2, "0")}`;
}

/**
 * Infer media type of replied item
 */
export function inferReplyMediaType(replyObj) {
  if (!replyObj) return "text";
  if (replyObj.msgType === "voice" || Boolean(replyObj.voiceDuration)) return "voice";
  if (
    replyObj.msgType === "video" ||
    Boolean(replyObj.videoDuration) ||
    /\.(mp4|webm)(\?.*)?$/i.test(replyObj.mediaUrl || "") ||
    /^data:video/i.test(replyObj.mediaUrl || "")
  ) {
    return "video";
  }
  if (
    replyObj.msgType === "media" ||
    replyObj.msgType === "photo" ||
    /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(replyObj.mediaUrl || "") ||
    /^data:image/i.test(replyObj.mediaUrl || "") ||
    Boolean(replyObj.mediaUrl)
  ) {
    return "photo";
  }
  if (replyObj.msgType === "call") return "call";
  return "text";
}

/**
 * Extract clean display information for reply composer preview and quote bubbles
 * Format:
 * - Line 1: senderName
 * - Line 2: typeLabel (e.g. "Voice message 00:07", "Photo", "Video", or text message)
 * - Line 3 (if caption): caption in italic with quotes
 */
export function getReplyDisplayInfo(replyObj) {
  if (!replyObj) {
    return { senderName: "Kalcerian", typeLabel: "", caption: null };
  }
  const senderName = replyObj.senderName || "Kalcerian";
  const mediaType = inferReplyMediaType(replyObj);

  if (mediaType === "voice") {
    const textStr = String(replyObj.text || "").trim();
    if (/^voice message\s+\d{1,2}:\d{2}$/i.test(textStr)) {
      const match = textStr.match(/\d{1,2}:\d{2}/);
      const formatted = match ? formatVoiceDuration(match[0]) : "00:07";
      return { senderName, typeLabel: `Voice message ${formatted}`, caption: null };
    }
    const durSec = replyObj.voiceDuration || 7;
    return {
      senderName,
      typeLabel: `Voice message ${formatVoiceDuration(durSec)}`,
      caption: null,
    };
  }

  if (mediaType === "video") {
    const rawCaption = replyObj.caption || replyObj.text || "";
    const isGenericText =
      !rawCaption ||
      /^(video|📹 video|media|photo|📷 media)$/i.test(rawCaption.trim());
    return {
      senderName,
      typeLabel: "Video",
      caption: isGenericText ? null : rawCaption.trim(),
    };
  }

  if (mediaType === "photo") {
    const rawCaption = replyObj.caption || replyObj.text || "";
    const isGenericText =
      !rawCaption ||
      /^(photo|📷 media|media|video|📹 video)$/i.test(rawCaption.trim());
    return {
      senderName,
      typeLabel: "Photo",
      caption: isGenericText ? null : rawCaption.trim(),
    };
  }

  if (mediaType === "call") {
    return {
      senderName,
      typeLabel: replyObj.text || "Call log",
      caption: null,
    };
  }

  return {
    senderName,
    typeLabel: replyObj.text || "Message",
    caption: null,
  };
}
