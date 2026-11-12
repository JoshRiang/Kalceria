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
 * Format timestamp of call launch into human readable format:
 * e.g. 2.30 AM 15 November 2026
 */
export function formatCallLaunchedTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const day = d.getDate();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${hours}.${minutes} ${ampm} ${day} ${month} ${year}`;
}

/**
 * Format call duration in full unit representation:
 * e.g. 1h 00m 00s or 0m 51s
 */
export function formatCallDurationDetailed(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}h ${mm}m ${ss}s`;
  }
  return `${minutes}m ${ss}s`;
}

/**
 * Infer media type of replied item
 */
export function inferReplyMediaType(replyObj) {
  if (!replyObj) return "text";
  if (replyObj.isEventMedia) {
    return replyObj.isVideo ? "video" : "photo";
  }
  if (
    replyObj.msgType === "event" ||
    Boolean(replyObj.isEvent) ||
    Boolean(replyObj.eventName) ||
    Boolean(replyObj.eventId)
  ) {
    return "event";
  }
  if (
    replyObj.msgType === "broadcast" ||
    Boolean(replyObj.isBroadcast) ||
    Boolean(replyObj.broadcastMessage)
  ) {
    return "broadcast";
  }
  if (replyObj.msgType === "call" || Boolean(replyObj.isCall)) return "call";
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
  return "text";
}

/**
 * Extract clean display information for reply composer preview and quote bubbles
 * Format:
 * - Line 1: senderName
 * - Line 2: typeLabel (e.g. "Broadcast 15m", "Voice call 2.30 AM 15 November 2026", "Photo", "Video", or text message)
 * - Line 3: call duration or caption in italic with quotes
 */
export function getReplyDisplayInfo(replyObj) {
  if (!replyObj) {
    return {
      senderName: "Kalcerian",
      typeLabel: "",
      caption: null,
      isBroadcast: false,
      isEvent: false,
      isCall: false,
    };
  }
  const senderName = replyObj.senderName || "Kalcerian";
  const mediaType = inferReplyMediaType(replyObj);

  let info;
  if (mediaType === "call") {
    const isVideo =
      replyObj.callMode === "video" ||
      /video/i.test(replyObj.text || "") ||
      replyObj.msgType === "video_call";
    const callTypePrefix = isVideo ? "Video call" : "Voice call";
    const rawTs = replyObj.callTimestamp || replyObj.ts || replyObj.createdAt;
    const launchedTime = formatCallLaunchedTimestamp(rawTs);
    const durationText = formatCallDurationDetailed(
      replyObj.callDuration !== undefined && replyObj.callDuration !== null
        ? replyObj.callDuration
        : 0
    );

    info = {
      senderName,
      typeLabel: launchedTime ? `${callTypePrefix} ${launchedTime}` : callTypePrefix,
      callTypePrefix,
      callLaunchedTime: launchedTime,
      callDurationText: durationText,
      caption: durationText,
      isCall: true,
      isBroadcast: false,
    };
  } else if (mediaType === "broadcast") {
    const rawCaption = replyObj.broadcastMessage || replyObj.caption || replyObj.text || "";
    const duration = replyObj.broadcastDuration || "0m";
    info = {
      senderName,
      typeLabel: `Broadcast ${duration}`,
      broadcastDuration: duration,
      isBroadcast: true,
      isEvent: false,
      isCall: false,
      caption: rawCaption ? String(rawCaption).trim() : null,
    };
  } else if (mediaType === "event") {
    const rawName =
      replyObj.eventName ||
      replyObj.title ||
      replyObj.name ||
      replyObj.caption ||
      replyObj.text ||
      "Event";
    info = {
      senderName,
      typeLabel: "Event",
      caption: String(rawName).trim(),
      isEvent: true,
      eventId: replyObj.eventId || replyObj.id,
      lat: replyObj.lat,
      lng: replyObj.lng,
      isBroadcast: false,
      isCall: false,
    };
  } else if (mediaType === "voice") {
    const textStr = String(replyObj.text || "").trim();
    if (/^voice message\s+\d{1,2}:\d{2}$/i.test(textStr)) {
      const match = textStr.match(/\d{1,2}:\d{2}/);
      const formatted = match ? formatVoiceDuration(match[0]) : "00:07";
      info = {
        senderName,
        typeLabel: `Voice message ${formatted}`,
        caption: null,
        isBroadcast: false,
        isCall: false,
      };
    } else {
      const durSec = replyObj.voiceDuration || 7;
      info = {
        senderName,
        typeLabel: `Voice message ${formatVoiceDuration(durSec)}`,
        caption: null,
        isBroadcast: false,
        isCall: false,
      };
    }
  } else if (mediaType === "video") {
    const rawCaption = replyObj.caption || replyObj.text || "";
    const isGenericText =
      !rawCaption ||
      /^(video|📹 video|media|photo|📷 media)$/i.test(rawCaption.trim());
    info = {
      senderName,
      typeLabel: "Video",
      caption: isGenericText ? null : rawCaption.trim(),
      isBroadcast: false,
      isCall: false,
    };
  } else if (mediaType === "photo") {
    const rawCaption = replyObj.caption || replyObj.text || "";
    const isGenericText =
      !rawCaption ||
      /^(photo|📷 media|media|video|📹 video)$/i.test(rawCaption.trim());
    info = {
      senderName,
      typeLabel: "Photo",
      caption: isGenericText ? null : rawCaption.trim(),
      isBroadcast: false,
      isCall: false,
    };
  } else {
    info = {
      senderName,
      typeLabel: replyObj.text || "Message",
      caption: null,
      isBroadcast: false,
      isCall: false,
    };
  }

  info.isEventMedia = Boolean(replyObj.isEventMedia);
  info.mediaUrl = replyObj.mediaUrl || null;
  info.isVideo = Boolean(replyObj.isVideo);
  info.clipId = replyObj.clipId || null;
  info.eventId = replyObj.eventId || null;
  info.clipIndex = replyObj.clipIndex !== undefined ? replyObj.clipIndex : null;
  return info;
}
