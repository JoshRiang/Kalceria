/**
 * frontend/components/map/mapPage/profilePatch.js
 *
 * Pure helpers to immutably patch local user and event collections upon profile edit.
 * Zero React dependencies, zero side-effects.
 *
 * Source: MapPageClient.jsx (L1310-L1379)
 */

export function patchUserCollection(users = [], currentUserId, patch = {}) {
  if (!currentUserId) return users;
  return (users || []).map((u) =>
    String(u?.id) === String(currentUserId) ? { ...u, ...patch } : u
  );
}

export function patchEventCollectionForUser(events = [], currentUserId, patch = {}) {
  if (!patch.displayName && !patch.name && !patch.profilePicture && !patch.coverImage) {
    return events;
  }
  return (events || []).map((ev) => {
    const isMine =
      ev?.id === 'own' ||
      (currentUserId && String(ev?.creator?.id) === String(currentUserId));
    if (!isMine) return ev;
    return {
      ...ev,
      creator: {
        ...(ev.creator || {}),
        name: patch.displayName || patch.name || ev.creator?.name,
        displayName: patch.displayName || patch.name || ev.creator?.displayName,
        profilePicture: patch.profilePicture ?? ev.creator?.profilePicture,
        coverImage: patch.coverImage ?? ev.creator?.coverImage,
        coverType: patch.coverType ?? ev.creator?.coverType,
      },
    };
  });
}

export function buildSyncedProfilePatch(updatedData = {}, serverUser = {}) {
  return {
    ...updatedData,
    ...serverUser,
    displayName: serverUser.displayName || serverUser.name || updatedData.displayName,
    profilePicture: serverUser.profilePicture || updatedData.profilePicture,
    coverImage: serverUser.coverImage || serverUser.coverUrl || updatedData.coverImage,
    coverUrl: serverUser.coverUrl || serverUser.coverImage || updatedData.coverImage,
  };
}

