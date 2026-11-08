"use client";

export const PERSONAL_CHAT_STORAGE_KEY = "kalceria_personal_chat_meta_v1";
export const EVENT_GROUP_CHAT_STORAGE_KEY = "kalceria_event_group_chat_meta_v1";
export const FAVOURITES_STORAGE_KEY = "kalceria_favourite_users_v1";
export const MUTED_STORAGE_KEY = "kalceria_muted_users_v1";

export function isEventOwner(eventItem, currentUser) {
  if (!eventItem || !currentUser) return false;
  if (eventItem.id === "own" || eventItem.isOwn) return true;

  const curId = currentUser.id ? String(currentUser.id) : null;
  const eventCreatorId =
    eventItem.creator?.id || eventItem.creatorId || eventItem.userId || null;

  // When both unique IDs exist, compare strictly by ID so shared display names never false-match
  if (curId && eventCreatorId) {
    return String(eventCreatorId) === curId;
  }

  const curNick = currentUser.nickname
    ? String(currentUser.nickname).trim().replace(/^@/, "").toLowerCase()
    : null;
  const creatorNick = eventItem.creator?.nickname
    ? String(eventItem.creator.nickname).trim().replace(/^@/, "").toLowerCase()
    : null;

  return Boolean(curNick && creatorNick && curNick === creatorNick);
}

export function doesEventBelongToUser(eventItem, targetUser, currentUserId = null) {
  if (!eventItem || !targetUser) return false;

  const targetId = targetUser.id ? String(targetUser.id) : null;
  const curId = currentUserId ? String(currentUserId) : null;
  const eventCreatorId =
    eventItem.creator?.id || eventItem.creatorId || eventItem.userId || null;

  // Never attribute the logged-in user's own event to another user's card in "Find other Kalcerians"
  if (curId && targetId !== curId) {
    if (
      eventItem.id === "own" ||
      eventItem.isOwn ||
      (eventCreatorId && String(eventCreatorId) === curId)
    ) {
      return false;
    }
  }

  // Strictly match by unique creator ID whenever available (never match by shared display name)
  if (eventCreatorId && targetId) {
    return String(eventCreatorId) === targetId;
  }

  // Fallback only when creator ID is absent: match exact unique @nickname (never display name)
  if (!eventCreatorId) {
    const targetNick = targetUser.nickname
      ? String(targetUser.nickname).trim().replace(/^@/, "").toLowerCase()
      : "";
    const creatorNick = eventItem.creator?.nickname
      ? String(eventItem.creator.nickname).trim().replace(/^@/, "").toLowerCase()
      : "";
    if (targetNick && creatorNick) {
      return targetNick === creatorNick;
    }
  }

  return false;
}

export function isEventCollaborator(eventItem, currentUser, acceptedCollabsMap = {}) {
  if (!eventItem || !currentUser) return false;
  const curId = currentUser.id ? String(currentUser.id) : null;
  const curNick = currentUser.nickname ? String(currentUser.nickname).toLowerCase() : null;

  const list = Array.isArray(acceptedCollabsMap?.[eventItem.id]) ? acceptedCollabsMap[eventItem.id] : [];
  const inAcceptedMap = list.some((entry) => {
    const val = String(entry || "");
    if (!val || val === "own") return false;
    return (curId && val === curId) || (curNick && val.toLowerCase() === curNick);
  });

  const inEventArray =
    Boolean(curId) &&
    ((Array.isArray(eventItem.collaboratorIds) &&
      eventItem.collaboratorIds.some((id) => String(id) === curId)) ||
      (Array.isArray(eventItem.collaborators) &&
        eventItem.collaborators.some((entry) => {
          const eid = typeof entry === "object" ? entry?.id : entry;
          return Boolean(eid) && String(eid) === curId;
        })) ||
      (Array.isArray(eventItem.collaboratorProfiles) &&
        eventItem.collaboratorProfiles.some(
          (profile) => Boolean(profile?.id) && String(profile.id) === curId
        )));

  return Boolean(inAcceptedMap || inEventArray || eventItem.isCollaborator);
}

export function isUserInEvent(eventItem, currentUser, acceptedCollabsMap = {}, requestedEventId = null) {
  if (!eventItem || !currentUser) return false;
  if (isEventOwner(eventItem, currentUser)) return true;
  if (isEventCollaborator(eventItem, currentUser, acceptedCollabsMap)) return true;
  if (requestedEventId && String(requestedEventId) === String(eventItem.id)) return true;
  return false;
}

export function getEventPendingRequests(eventItem, currentUser, eventRequestsMap = {}) {
  if (!eventItem || !eventRequestsMap) return [];
  const direct = eventRequestsMap[eventItem.id];
  if (Array.isArray(direct)) return direct;
  if (isEventOwner(eventItem, currentUser) && Array.isArray(eventRequestsMap["own"])) {
    return eventRequestsMap["own"];
  }
  return [];
}
