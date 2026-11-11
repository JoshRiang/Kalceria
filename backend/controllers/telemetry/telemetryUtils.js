/**
 * Telemetry Geometric and Validation Utilities
 */

export const DISTRICT_OFFSET = 0.012;

export function parseCoordinate(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function approximateCoordinate(lat, lng) {
  return {
    lat: Math.round(lat / DISTRICT_OFFSET) * DISTRICT_OFFSET,
    lng: Math.round(lng / DISTRICT_OFFSET) * DISTRICT_OFFSET,
  };
}

export function resolveDeterministicUserCoords(user, rawLat, rawLng, index = 0) {
  let baseLat = Number.isFinite(rawLat) && Math.abs(rawLat) > 0.001
    ? rawLat
    : Number.isFinite(user?.domicileLat) && Math.abs(user.domicileLat) > 0.001
      ? Number(user.domicileLat)
      : -6.2735;
  let baseLng = Number.isFinite(rawLng) && Math.abs(rawLng) > 0.001
    ? rawLng
    : Number.isFinite(user?.domicileLng) && Math.abs(user.domicileLng) > 0.001
      ? Number(user.domicileLng)
      : 106.7150;

  // Apply a small deterministic offset based on user ID hash so users sharing city-center defaults don't stack on top of each other
  const seedStr = String(user?.id || user?.nickname || user?.name || index);
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash + seedStr.charCodeAt(i)) | 0;
  }
  const angle = ((Math.abs(hash) % 360) * Math.PI) / 180;
  const radius = 0.0022 + ((Math.abs(hash >> 4) % 5) * 0.0011);
  // If using fallback default/city-level coords, spread slightly so every avatar is distinct and clickable on the map
  const isCityDefault =
    Math.abs(baseLat - -6.2088) < 0.0005 ||
    Math.abs(baseLat - -6.2735) < 0.0005;
  if (isCityDefault) {
    baseLat += Math.sin(angle) * radius;
    baseLng += Math.cos(angle) * radius;
  }
  return {
    lat: Number(baseLat.toFixed(6)),
    lng: Number(baseLng.toFixed(6)),
  };
}

export function isValidTargetId(targetId, currentUserId = null) {
  if (typeof targetId !== "string" || !targetId.trim()) return false;
  if (currentUserId && targetId === currentUserId) return false;
  return /^[a-zA-Z0-9_@.-]+$/.test(targetId);
}

