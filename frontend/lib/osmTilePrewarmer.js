export const OSM_SUBDOMAINS = ["a", "b", "c"];

const PREWARMED_TILE_URLS = new Set();

export function latLngToTileXY(lat, lng, z) {
  const n = 2 ** z;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, Number(lat)));
  const latRad = (clampedLat * Math.PI) / 180;
  const x = Math.floor(((((Number(lng) + 180) / 360) % 1) + 1) % 1 * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

/**
 * Pre-warms keyless OpenStreetMap tiles around a target coordinate using the exact
 * same subdomain hash (`Math.abs(x + y) % 3`) as Leaflet's TileLayer._getSubdomain,
 * so jump / recenter / flyTo arrivals render immediately from browser HTTP & decode cache.
 */
export function prewarmOsmTiles(lat, lng, zoom = 16) {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;

  const targetZ = Math.max(1, Math.min(19, Math.round(Number(zoom) || 16)));
  const levels = [
    { z: targetZ, radius: 1 },
    { z: Math.max(11, targetZ - 2), radius: 1 },
  ];

  levels.forEach(({ z, radius }) => {
    const maxIndex = 2 ** z - 1;
    const center = latLngToTileXY(lat, lng, z);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const tx = center.x + dx;
        const ty = center.y + dy;
        if (tx < 0 || ty < 0 || tx > maxIndex || ty > maxIndex) continue;
        const shard = OSM_SUBDOMAINS[Math.abs(tx + ty) % OSM_SUBDOMAINS.length];
        const url = `https://${shard}.tile.openstreetmap.org/${z}/${tx}/${ty}.png`;
        if (PREWARMED_TILE_URLS.has(url)) continue;
        if (PREWARMED_TILE_URLS.size >= 600) {
          const oldest = PREWARMED_TILE_URLS.values().next().value;
          if (oldest) PREWARMED_TILE_URLS.delete(oldest);
        }
        PREWARMED_TILE_URLS.add(url);
        const img = new window.Image();
        img.decoding = "async";
        img.src = url;
      }
    }
  });
}
