/**
 * Pure domain helpers for Event GroupChat roles, permissions, and line card previews.
 * Zero @/ alias or React imports so `node --test` can execute directly.
 */

export const GROUP_ROLE_MAKER = "MAKER";
export const GROUP_ROLE_COLLABORATOR = "COLLABORATOR";
export const GROUP_ROLE_MEMBER = "MEMBER";

/**
 * Computes exact permission flags for actor managing a target member.
 * Iron rule: NOBODY can ever kick or demote the MAKER.
 */
export function canActorManageMember(actorRole, targetRole, actorId = null, targetId = null) {
  if (actorId && targetId && String(actorId) === String(targetId)) {
    return { canPromote: false, canDemote: false, canKick: false };
  }
  if (targetRole === GROUP_ROLE_MAKER) {
    return { canPromote: false, canDemote: false, canKick: false };
  }
  if (actorRole === GROUP_ROLE_MAKER) {
    return {
      canPromote: targetRole === GROUP_ROLE_MEMBER,
      canDemote: targetRole === GROUP_ROLE_COLLABORATOR,
      canKick: true,
    };
  }
  if (actorRole === GROUP_ROLE_COLLABORATOR) {
    return {
      canPromote: targetRole === GROUP_ROLE_MEMBER,
      canDemote: false,
      canKick: true,
    };
  }
  return { canPromote: false, canDemote: false, canKick: false };
}

export function formatGroupLastMessage(lastMessage, memberCount = 1, maxLen = 32) {
  if (!lastMessage) {
    return `Group meeting · ${memberCount} member${memberCount > 1 ? "s" : ""}`;
  }
  const sender = lastMessage.senderName ? `${String(lastMessage.senderName).split(" ")[0]}: ` : "";
  const type = String(lastMessage.type || "text").toLowerCase();
  let body = String(lastMessage.text || "").trim();

  if (type === "call") {
    const mode = String(lastMessage.callMode || "").toLowerCase();
    body = mode === "video" ? "Video call ended" : mode === "voice" ? "Voice call ended" : "Call ended";
    return body;
  }
  if (type === "photo" || type === "image" || type === "media") body = "Photo";
  else if (type === "video") body = "Video";
  else if (type === "voice" || type === "audio") body = "Voice message";
  else if (lastMessage.replyTo) body = `Replied: ${body || "Message"}`;

  const combined = `${sender}${body || "New message"}`.replace(/\s+/g, " ").trim();
  if (combined.length <= maxLen) return combined;
  return `${combined.slice(0, maxLen).trimEnd()}...`;
}

