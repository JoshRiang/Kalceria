import crypto from 'node:crypto';
import { redis } from '../../lib/redis.js';

export const INDONESIAN_PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
  'Jambi', 'Sumatera Selatan', 'Kepulauan Bangka Belitung', 'Bengkulu', 'Lampung',
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Daerah Istimewa Yogyakarta', 'Jawa Timur',
  'Banten', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah',
  'Papua Pegunungan', 'Papua Barat Daya',
];

export const ID_BOUNDS = { minLat: -11.2, maxLat: 6.2, minLon: 94.9, maxLon: 141.1 };
export const CACHE_TTL_SEC = 24 * 60 * 60; // 24 hours
export const LOCATION_HMAC_SECRET =
  process.env.LOCATION_HMAC_SECRET ||
  process.env.JWT_SECRET ||
  'kalceria-geo-validation-secret';

// Bounded fallback memory cache ONLY used if Redis is offline
export const fallbackCache = new Map();
export const MAX_FALLBACK_ITEMS = 2000;

export async function getCache(key) {
  if (redis && redis.status === 'ready') {
    try {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  const item = fallbackCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    fallbackCache.delete(key);
    return null;
  }
  return item.value;
}

export async function setCache(key, value, ttlSec = CACHE_TTL_SEC) {
  if (redis && redis.status === 'ready') {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSec);
      return;
    } catch {}
  }
  if (fallbackCache.size >= MAX_FALLBACK_ITEMS) {
    const oldestKey = fallbackCache.keys().next().value;
    if (oldestKey) fallbackCache.delete(oldestKey);
  }
  fallbackCache.set(key, { value, expiry: Date.now() + ttlSec * 1000 });
}

export function signLocationToken(formatted, lat = '', lon = '') {
  const norm = String(formatted || '').trim().toLowerCase();
  const latStr = lat !== '' && lat !== null && lat !== undefined ? Number(lat).toFixed(4) : '';
  const lonStr = lon !== '' && lon !== null && lon !== undefined ? Number(lon).toFixed(4) : '';
  return crypto
    .createHmac('sha256', LOCATION_HMAC_SECRET)
    .update(`${norm}:${latStr}:${lonStr}`)
    .digest('hex');
}

export function isWithinIndonesiaBounds(lat, lon) {
  const nLat = Number(lat);
  const nLon = Number(lon);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLon)) return false;
  return (
    nLat >= ID_BOUNDS.minLat &&
    nLat <= ID_BOUNDS.maxLat &&
    nLon >= ID_BOUNDS.minLon &&
    nLon <= ID_BOUNDS.maxLon
  );
}
