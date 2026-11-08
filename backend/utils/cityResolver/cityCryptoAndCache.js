import crypto from 'node:crypto';
import { redis } from '../../lib/redis.js';

export const CITY_CACHE_TTL_SEC = 24 * 60 * 60; // 24 hours
export const CITY_HMAC_SECRET =
  process.env.LOCATION_HMAC_SECRET ||
  process.env.JWT_SECRET ||
  'kalceria-city-validation-secret';

// Bounded fallback memory cache if Redis is temporarily unavailable
export const fallbackMem = new Map();
export const MAX_MEM_ENTRIES = 3000;

export async function getCached(key) {
  if (redis && redis.status === 'ready') {
    try {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  const entry = fallbackMem.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    fallbackMem.delete(key);
    return null;
  }
  return entry.val;
}

export async function setCached(key, val, ttlSec = CITY_CACHE_TTL_SEC) {
  if (redis && redis.status === 'ready') {
    try {
      await redis.set(key, JSON.stringify(val), 'EX', ttlSec);
      return;
    } catch {}
  }
  if (fallbackMem.size >= MAX_MEM_ENTRIES) {
    const oldest = fallbackMem.keys().next().value;
    if (oldest !== undefined) fallbackMem.delete(oldest);
  }
  fallbackMem.set(key, { val, exp: Date.now() + ttlSec * 1000 });
}

export function normalizeCityKey(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(kota\s+administrasi|kabupaten\s+administrasi|kota\s+madya|kotamadya|kabupaten|kab\.|kota|dki|daerah\s+khusus\s+ibukota|city\s+of|municipality\s+of)\b/gi, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function signCityToken(cityName, lat = 0, lng = 0) {
  const norm = normalizeCityKey(cityName);
  const latFixed = Number.isFinite(Number(lat)) ? Number(lat).toFixed(4) : '0.0000';
  const lngFixed = Number.isFinite(Number(lng)) ? Number(lng).toFixed(4) : '0.0000';
  return crypto
    .createHmac('sha256', CITY_HMAC_SECRET)
    .update(`city:v1:${norm}:${latFixed}:${lngFixed}`)
    .digest('hex');
}

export function verifyCityToken(cityName, lat, lng, token) {
  if (!token || typeof token !== 'string' || !cityName) return false;
  const expected = signCityToken(cityName, lat, lng);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildCityResponseObject({
  name,
  country = 'Indonesia',
  countryCode = 'ID',
  region = '',
  lat = 0,
  lng = 0,
}) {
  const cleanName = String(name || '').trim();
  const upperCode = String(countryCode || 'ID').toUpperCase();
  const isIndonesia = upperCode === 'ID';
  const label = isIndonesia || !country ? cleanName : `${cleanName}, ${country}`;
  const numLat = Number.isFinite(Number(lat)) ? Number(lat) : 0;
  const numLng = Number.isFinite(Number(lng)) ? Number(lng) : 0;
  return {
    name: cleanName,
    label,
    region: String(region || '').trim(),
    country: String(country || (isIndonesia ? 'Indonesia' : '')).trim(),
    countryCode: upperCode,
    isIndonesia,
    lat: numLat,
    lng: numLng,
    cityToken: signCityToken(cleanName, numLat, numLng),
    labelToken: signCityToken(label, numLat, numLng),
  };
}

export function cleanAddressNoise(str) {
  return String(str || '')
    .replace(/\b(?:jl|jln|jalan|gg|gang|blok|block|rt|rw|no|nomor|apt|apartemen|apartment|suite|ste|unit|lt|lantai|kav|kavling)\.?\s*[a-z0-9./-]*/gi, ' ')
    .replace(/\b\d{4,6}\b/g, ' ') // strip postal codes (5-digit ID/US, 4-digit AU/SG, 6-digit SG/JP)
    .replace(/\s+/g, ' ')
    .trim();
}
