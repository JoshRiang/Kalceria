/**
 * Pure domain helpers for Kalcerians Global vs Friends scope filtering & notification badges.
 * Zero React/DOM/@ imports so node --test can verify directly.
 */

export const GLOBAL_CARDS_LIMIT = 8;

export function resolveFriendshipStatus(user, currentUserId, friendsState) {
  if (!user) return "none";
  const uid = String(user.id || "");
  if (currentUserId && uid === String(currentUserId)) return "self";

  if (friendsState?.loaded) {
    if (friendsState.friendSet?.has(uid)) return "friend";
    if (friendsState.incomingSet?.has(uid)) return "incoming_pending";
    if (friendsState.outgoingSet?.has(uid)) return "outgoing_pending";
    return "none";
  }

  return user.friendshipStatus || "none";
}

export function buildScopedKalcerians(sidebarKalcerians, activeScope, currentUserId, friendsState) {
  const list = Array.isArray(sidebarKalcerians) ? sidebarKalcerians : [];
  if (activeScope === "global") {
    const nonFriends = list.filter((u) => {
      const status = resolveFriendshipStatus(u, currentUserId, friendsState);
      return status !== "friend" && status !== "self";
    });
    // Prioritize incoming friend requests at the top of Global so they are never clipped by the 8-card cap
    nonFriends.sort((a, b) => {
      const sa = resolveFriendshipStatus(a, currentUserId, friendsState);
      const sb = resolveFriendshipStatus(b, currentUserId, friendsState);
      const rank = (s) => (s === "incoming_pending" ? 0 : s === "outgoing_pending" ? 1 : 2);
      return rank(sa) - rank(sb);
    });
    return nonFriends.slice(0, GLOBAL_CARDS_LIMIT);
  }

  return list.filter((u) => {
    const status = resolveFriendshipStatus(u, currentUserId, friendsState);
    return status === "friend" || status === "self";
  });
}

export function computeScopeNotifications({
  sidebarKalcerians,
  currentUserId,
  friendsState,
  personalChatMap,
  events,
  eventRequestsMap,
  eventGroupChatMap,
}) {
  const list = Array.isArray(sidebarKalcerians) ? sidebarKalcerians : [];
  let hasFriendsNotif = false;
  let hasGlobalNotif = (friendsState?.incomingRequestIds?.length || 0) > 0;

  for (const u of list) {
    const uid = String(u.id || "");
    const status = resolveFriendshipStatus(u, currentUserId, friendsState);
    const unreadChat = Number(personalChatMap?.[uid]?.unreadCount || 0) > 0;
    if (status === "friend" || status === "self") {
      if (unreadChat) hasFriendsNotif = true;
    } else {
      if (status === "incoming_pending" || unreadChat) hasGlobalNotif = true;
    }
  }

  if (!hasFriendsNotif && Array.isArray(events)) {
    for (const ev of events) {
      const reqs = eventRequestsMap?.[ev.id];
      const pendingCount = Math.max(
        Array.isArray(reqs) ? reqs.length : 0,
        Number(ev.pendingRequestsCount || 0)
      );
      const unreadGroup = Number(eventGroupChatMap?.[ev.id]?.unreadCount || 0);
      if (pendingCount > 0 || unreadGroup > 0) {
        hasFriendsNotif = true;
        break;
      }
    }
  }

  return { hasFriendsNotif, hasGlobalNotif };
}
