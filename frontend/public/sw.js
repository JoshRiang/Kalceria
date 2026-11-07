const CACHE_NAME = 'kalceria-pwa-v6';
const MAX_TILE_ENTRIES = 160;

let isPruning = false;
let lastPruneAt = 0;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

async function maybePruneTileCache(cache, maxItems) {
  const now = Date.now();
  if (isPruning || now - lastPruneAt < 20000) return;
  isPruning = true;
  lastPruneAt = now;
  try {
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const overflow = keys.slice(0, keys.length - maxItems);
      await Promise.all(overflow.map((k) => cache.delete(k)));
    }
  } catch {} finally {
    isPruning = false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Strictly only assist third-party OpenStreetMap / CARTO map tiles.
  // Never intercept app HTML, JS bundles, API, Auth, or static brand assets so zero stale-cache bugs can ever occur.
  const isMapTile = (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('basemaps.cartocdn.com')
  );

  if (!isMapTile) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        if (res && res.status === 200) {
          cache.put(req, res.clone());
          maybePruneTileCache(cache, MAX_TILE_ENTRIES);
        }
        return res;
      } catch {
        return Response.error();
      }
    })
  );
});
