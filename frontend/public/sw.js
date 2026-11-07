const CACHE_NAME = 'kalceria-pwa-v5';
const MAX_TILE_ENTRIES = 150;

const PRECACHE_ASSETS = [
  '/favicon.webp',
  '/flying_cat.webp',
  '/kalcermap_bottom.webp',
  '/coki.webp',
  '/portal.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
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

async function pruneCache(cache, maxItems) {
  try {
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      for (let i = 0; i < keys.length - maxItems; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch {}
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

  // Never intercept API, Auth, Next internals, or Admin requests
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/_next/webpack-hmr')
  ) {
    return;
  }

  // 1. Vector Map Tiles (OSM, CartoDB, CARTO basemaps, MapLibre)
  const isMapTile = (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('basemaps.cartocdn.com') ||
    Boolean(url.pathname.match(/\/\d+\/\d+\/\d+\.(png|webp|mvt|pbf)$/i))
  );

  if (isMapTile) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req).then((res) => {
          if (res && res.status === 200) {
            cache.put(req, res.clone());
            pruneCache(cache, MAX_TILE_ENTRIES);
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 2. Static Sprites & WebP Brand Assets (Network-First to eliminate stale cache)
  const isStaticSprite = (
    url.origin === self.location.origin &&
    (url.pathname.endsWith('.webp') || url.pathname.endsWith('.png') || url.pathname.endsWith('.otf')) &&
    !url.pathname.startsWith('/api')
  );

  if (isStaticSprite) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
});

