/**
 * frontend/components/map/mapPage/mapEntitiesProjection.js
 *
 * Pure projection of online map users and active events for Leaflet SnapMap.
 * Zero React dependencies, zero side-effects.
 *
 * Source: MapPageClient.jsx (L558-L650)
 */

export function buildVisibleMapUsers(
  {
    mapUsersData = [],
    kalcerians = [],
    currentUser = null,
    selfLiveCoords = null,
    presence = 'online',
    blockedUserIds = [],
    blockedByUserIds = [],
  },
  { hasValidCoordinates = () => false, resolvePersistentAvatarUrl = () => null } = {}
) {
  const mergedMap = new Map();
  const blockedSet = new Set([...(blockedUserIds || []), ...(blockedByUserIds || [])]);

  (mapUsersData || []).forEach((u) => {
    if (!u?.id || blockedSet.has(u.id)) return;
    if (u.isOnline === false || u.allowLiveLocation === false) return;
    if (!hasValidCoordinates(u.lat, u.lng)) return;
    const lat = Number(u.lat);
    const lng = Number(u.lng);
    mergedMap.set(String(u.id), {
      ...u,
      displayName: u.displayName || u.name || u.nickname || 'Kalcerian',
      nickname: u.nickname || u.name || 'Kalcerian',
      profilePicture: resolvePersistentAvatarUrl(u),
      isOnline: true,
      allowLiveLocation: true,
      lat,
      lng,
    });
  });

  (kalcerians || []).forEach((u) => {
    if (!u?.id || blockedSet.has(u.id)) return;
    const key = String(u.id);
    const existing = mergedMap.get(key);
    // Strictly skip offline users from appearing on the map
    if (!u.isOnline || u.allowLiveLocation === false) {
      mergedMap.delete(key);
      return;
    }
    const rawLat = existing ? existing.lat : u.lat;
    const rawLng = existing ? existing.lng : u.lng;
    if (!hasValidCoordinates(rawLat, rawLng)) return;
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    mergedMap.set(key, {
      ...(existing || {}),
      ...u,
      displayName: u.displayName || existing?.displayName || u.name || u.nickname || 'Kalcerian',
      nickname: u.nickname || existing?.nickname || u.name || 'Kalcerian',
      profilePicture: resolvePersistentAvatarUrl(u),
      isOnline: true,
      allowLiveLocation: true,
      lat,
      lng,
    });
  });

  if (currentUser?.id) {
    const selfKey = String(currentUser.id);
    if (presence === 'online') {
      const existingSelf = mergedMap.get(selfKey);
      let selfCoords = null;
      if (existingSelf && hasValidCoordinates(existingSelf.lat, existingSelf.lng)) {
        selfCoords = { lat: existingSelf.lat, lng: existingSelf.lng };
      } else if (selfLiveCoords && hasValidCoordinates(selfLiveCoords.lat, selfLiveCoords.lng)) {
        selfCoords = { lat: selfLiveCoords.lat, lng: selfLiveCoords.lng };
      } else if (hasValidCoordinates(currentUser.domicileLat, currentUser.domicileLng)) {
        selfCoords = {
          lat: Number(currentUser.domicileLat),
          lng: Number(currentUser.domicileLng),
        };
      }

      if (selfCoords) {
        mergedMap.set(selfKey, {
          ...(existingSelf || {}),
          ...currentUser,
          displayName: currentUser.displayName || currentUser.name || currentUser.nickname || 'Kalcerian',
          nickname: currentUser.nickname || currentUser.name || 'Kalcerian',
          profilePicture: resolvePersistentAvatarUrl(currentUser),
          isOnline: true,
          allowLiveLocation: true,
          lat: selfCoords.lat,
          lng: selfCoords.lng,
        });
      } else {
        mergedMap.delete(selfKey);
      }
    } else {
      mergedMap.delete(selfKey);
    }
  }

  return Array.from(mergedMap.values());
}

export function buildVisibleEvents(eventsOrOptions = [], blockedUserIds = [], blockedByUserIds = [], now = Date.now()) {
  let events = eventsOrOptions;
  let blocked = blockedUserIds;
  let blockedBy = blockedByUserIds;
  let currentNow = now;

  if (eventsOrOptions && !Array.isArray(eventsOrOptions) && typeof eventsOrOptions === "object") {
    events = eventsOrOptions.events;
    blocked = eventsOrOptions.blockedUserIds;
    blockedBy = eventsOrOptions.blockedByUserIds;
    currentNow = eventsOrOptions.now ?? Date.now();
  }

  const blockedSet = new Set([...(blocked || []), ...(blockedBy || [])]);
  return (events || [])
    .filter((e) => !blockedSet.has(e?.creator?.id) && !blockedSet.has(e?.creatorId))
    .filter((e) => !e?.expiresAt || new Date(e.expiresAt).getTime() > currentNow);
}

