import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';

// All 38 Provinces of Indonesia (kept exported for compatibility)
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

// Indonesia Geographic Bounding Box (Sabang to Merauke, Miangas to Rote)
const ID_BOUNDS = {
  minLat: -11.2,
  maxLat: 6.2,
  minLon: 94.9,
  maxLon: 141.1,
};

const CACHE_TTL_SEC = 24 * 60 * 60; // 24 hours
const LOCATION_HMAC_SECRET = process.env.LOCATION_HMAC_SECRET || process.env.JWT_SECRET || 'kalceria-geo-validation-secret';

// Bounded fallback memory cache ONLY used if Redis is offline
const fallbackCache = new Map();
const MAX_FALLBACK_ITEMS = 2000;

async function getCache(key) {
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

async function setCache(key, value, ttlSec = CACHE_TTL_SEC) {
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

/**
 * Normalizes messy Indonesian address input:
 * Example: "Perumahan Azul, Jl Swadarma Raya, RT/RW 02/05, No. 14"
 * Produces progressive search candidates:
 *   1. "Jalan Swadarma Raya" (extracted street + area without RT/RW/Perumahan noise)
 *   2. Full cleaned string without RT/RW/Blok/No
 */
export function buildIndonesianSearchCandidates(rawInput) {
  const clean = String(rawInput || '').trim();
  if (!clean) return [];

  // 1. Strip RT/RW, Blok, Nomor, Kode Pos noise that breaks OSM geocoders
  let stripped = clean
    .replace(/\b(?:rt|rw)\s*[./:-]?\s*\d+(?:\s*[/|-]\s*(?:rw\s*)?\d+)?/gi, ' ')
    .replace(/\b(?:no|nomor|blok|kav|kavling|lantai|lt)\s*[.:-]?\s*[a-z0-9/-]+/gi, ' ')
    .replace(/\b\d{5}\b/g, ' ') // postal codes
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Normalize "Jl.", "Jln.", "Gg." to full words for better OSM tokenization
  const expanded = stripped
    .replace(/\b(?:jl|jln)\.?\s+/gi, 'Jalan ')
    .replace(/\bgg\.?\s+/gi, 'Gang ');

  const candidates = new Set();

  // If the user only typed "Jl" or "Jalan", search major "Jalan Raya" in Indonesia
  if (/^(?:jl|jln|jalan)\.?$/i.test(clean)) {
    return ['Jalan Raya'];
  }

  // 3. Extract from "Jalan ..." onward if preceded by "Perumahan X, Komplek Y, ..."
  const jalanMatch = expanded.match(/\b(Jalan\s+[^,]+(?:,\s*[^,]+)*)/i);
  if (jalanMatch) {
    candidates.add(jalanMatch[1].trim());
  }

  // 4. Strip "Perumahan ...", "Komplek ...", "Cluster ...", "Apartemen ..." prefix
  const withoutComplex = expanded
    .replace(/\b(?:perumahan|perum|komplek|komp|cluster|apartemen|apt|gedung|ruko)\s+[^,]+,?\s*/gi, '')
    .trim();

  if (withoutComplex.length >= 2) {
    candidates.add(withoutComplex);
  }

  if (expanded.length >= 2) {
    candidates.add(expanded);
  }

  return Array.from(candidates);
}

/**
 * Normalizes OSM/Photon province names to official Indonesian names
 */
function normalizeProvinceName(rawProvince, city = '') {
  const p = String(rawProvince || '').trim();
  const c = String(city || '').toLowerCase();

  if (!p) {
    if (c.includes('jakarta')) return 'DKI Jakarta';
    if (c.includes('yogyakarta') || c.includes('sleman') || c.includes('bantul')) {
      return 'Daerah Istimewa Yogyakarta';
    }
    return '';
  }

  const lower = p.toLowerCase();
  if (lower.includes('jakarta')) return 'DKI Jakarta';
  if (lower.includes('yogyakarta') || lower === 'diy') return 'Daerah Istimewa Yogyakarta';
  if (lower.includes('bangka')) return 'Kepulauan Bangka Belitung';
  if (lower === 'west java') return 'Jawa Barat';
  if (lower === 'central java') return 'Jawa Tengah';
  if (lower === 'east java') return 'Jawa Timur';
  if (lower === 'north sumatra') return 'Sumatera Utara';
  if (lower === 'south sumatra') return 'Sumatera Selatan';
  if (lower === 'west sumatra') return 'Sumatera Barat';
  if (lower === 'east kalimantan') return 'Kalimantan Timur';
  if (lower === 'south sulawesi') return 'Sulawesi Selatan';

  const matched = INDONESIAN_PROVINCES.find(
    (prov) => prov.toLowerCase() === lower || lower.includes(prov.toLowerCase())
  );
  return matched || p;
}

/**
 * Signs a location string so the backend can cryptographically verify
 * that the submitted address came from the validated autocomplete/reverse list.
 */
export function signLocationToken(formatted, lat = '', lon = '') {
  const normalized = String(formatted || '').trim().toLowerCase();
  return crypto
    .createHmac('sha256', LOCATION_HMAC_SECRET)
    .update(`${normalized}|${lat}|${lon}`)
    .digest('hex');
}

/**
 * Formats location strictly as: "Road/Area, City/Regency, Province" (Stops at Province)
 */
function buildStandardLocation({ road, suburb, city, province, lat, lon, sourceId }) {
  const normProvince = normalizeProvinceName(province, city);
  const primaryWay = (road || suburb || '').trim();
  const cleanCity = (city || '').trim();

  const parts = [];
  if (primaryWay) parts.push(primaryWay);
  if (cleanCity && cleanCity.toLowerCase() !== primaryWay.toLowerCase()) {
    parts.push(cleanCity);
  }
  if (normProvince && normProvince.toLowerCase() !== cleanCity.toLowerCase()) {
    parts.push(normProvince);
  }

  const formatted = parts.join(', ');
  const numLat = Number(lat);
  const numLon = Number(lon);

  const token = signLocationToken(formatted, numLat, numLon);

  return {
    id: sourceId || `loc-${crypto.createHash('md5').update(formatted).digest('hex').slice(0, 10)}`,
    formatted,
    road: primaryWay,
    city: cleanCity,
    province: normProvince,
    lat: Number.isFinite(numLat) ? numLat : null,
    lon: Number.isFinite(numLon) ? numLon : null,
    selectionToken: token,
  };
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

/**
 * Queries Photon (Komoot's free OSM autocomplete engine) bounded to Indonesia
 */
async function queryPhotonIndonesia(candidateQuery, limit = 8) {
  const bbox = `${ID_BOUNDS.minLon},${ID_BOUNDS.minLat},${ID_BOUNDS.maxLon},${ID_BOUNDS.maxLat}`;
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(candidateQuery)}&bbox=${bbox}&limit=${limit}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Kalceria-Platform/1.0 (contact@kalceria.com)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data?.features)) return [];

    return data.features
      .filter((f) => {
        const cc = f.properties?.countrycode?.toUpperCase();
        return !cc || cc === 'ID';
      })
      .map((f) => {
        const p = f.properties || {};
        const [lon, lat] = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates : [];
        const road = p.street || p.name || '';
        const suburb = p.district || p.locality || '';
        const city = p.city || p.county || p.municipality || '';
        const province = p.state || '';

        return buildStandardLocation({
          road,
          suburb,
          city,
          province,
          lat,
          lon,
          sourceId: `photon-${p.osm_id || Math.random()}`,
        });
      })
      .filter((loc) => loc.formatted && loc.province);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Queries Nominatim bounded to countrycodes=id
 */
async function queryNominatimIndonesia(candidateQuery, limit = 8) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=id&limit=${limit}&q=${encodeURIComponent(candidateQuery)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Kalceria-Platform/1.0 (contact@kalceria.com)',
        'Accept-Language': 'id,en',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item) => {
        const addr = item.address || {};
        const road = addr.road || addr.pedestrian || addr.street || addr.residential || item.name || '';
        const suburb = addr.suburb || addr.village || addr.neighbourhood || '';
        const city =
          addr.city ||
          addr.town ||
          addr.municipality ||
          addr.county ||
          addr.city_district ||
          '';
        const province = addr.state || addr.province || addr.region || '';

        return buildStandardLocation({
          road,
          suburb,
          city,
          province,
          lat: item.lat,
          lon: item.lon,
          sourceId: `osm-${item.place_id || item.osm_id}`,
        });
      })
      .filter((loc) => loc.formatted && loc.province);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validates whether a submitted location is an authentic Indonesian location.
 * Supports:
 * 1. Signed object/token from autocomplete list
 * 2. Exact match in Redis-cached verified search results
 * 3. Structured string "Road/Area, City/Kabupaten, Province" ending in a valid province
 */
export function isValidIndonesianLocation(locationInput, options = {}) {
  // Case 1: Object or options with cryptographic selectionToken
  if (typeof locationInput === 'object' && locationInput !== null) {
    const { formatted, lat, lon, selectionToken } = locationInput;
    if (selectionToken && formatted) {
      const expected = signLocationToken(formatted, lat ?? '', lon ?? '');
      if (selectionToken !== expected) return false;
      return true;
    }
    if (lat !== undefined && lon !== undefined && !isWithinIndonesiaBounds(lat, lon)) {
      return false;
    }
    locationInput = formatted;
  }

  if (options?.selectionToken && typeof locationInput === 'string') {
    const expected = signLocationToken(locationInput, options.lat ?? '', options.lon ?? '');
    if (options.selectionToken !== expected) return false;
    return true;
  }

  if (typeof locationInput !== 'string') return false;
  const clean = locationInput.trim();
  if (clean.length < 3 || clean.length > 300) return false;

  // Direct province match (e.g. "Bali", "DKI Jakarta", "Jawa Barat")
  if (INDONESIAN_PROVINCES.some((prov) => prov.toLowerCase() === clean.toLowerCase())) {
    return true;
  }

  // Reject gibberish without comma-separated structure (must have at least "Area/Road, Province" or "City, Province")
  const segments = clean.split(',').map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) return false;

  // Must contain a valid Indonesian street/area prefix OR at least 2 segments where the final/penultimate segment is a real Indonesian Province
  const lastSegment = segments[segments.length - 1].toLowerCase();
  const secondLastSegment = segments.length >= 2 ? segments[segments.length - 2].toLowerCase() : '';

  const matchesProvince = INDONESIAN_PROVINCES.some((prov) => {
    const pLow = prov.toLowerCase();
    return lastSegment === pLow || secondLastSegment === pLow || lastSegment.includes(pLow);
  });

  if (!matchesProvince) return false;

  // Ensure the first segment isn't random keyboard mash (must contain recognizable letters & valid address tokens)
  const firstSegment = segments[0];
  if (!/^[a-zA-Z0-9\s.,'()/-]{3,}$/.test(firstSegment)) return false;

  return true;
}

/**
 * GET /api/location/search?q=...
 * Autocomplete endpoint that handles "Jl", "Perumahan Azul, Jl Swadarma Raya, RT/RW 02", etc.
 */
export async function searchIndonesianLocations(req, res) {
  const rawQuery = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (!rawQuery || rawQuery.length < 2) {
    return res.json({ results: [] });
  }

  const cacheKey = `geo:search:v2:${rawQuery.toLowerCase()}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json({ results: cached });
  }

  const candidates = buildIndonesianSearchCandidates(rawQuery);
  const combined = [];
  const seen = new Set();

  const addUnique = (items) => {
    for (const item of items) {
      const key = item.formatted.toLowerCase();
      if (!seen.has(key) && item.formatted.includes(',')) {
        seen.add(key);
        combined.push(item);
      }
    }
  };

  // Progressive candidate resolution:
  for (const candidate of candidates) {
    const [photonMatches, nominatimMatches] = await Promise.all([
      queryPhotonIndonesia(candidate, 8),
      queryNominatimIndonesia(candidate, 6),
    ]);

    addUnique(photonMatches);
    addUnique(nominatimMatches);

    if (combined.length >= 5) break;
  }

  const results = combined.slice(0, 10);

  // Cache every returned formatted string in Redis so server-side validation can verify it was on the list
  if (results.length > 0) {
    await setCache(cacheKey, results, CACHE_TTL_SEC);
    for (const r of results) {
      await setCache(`geo:verified:${r.formatted.toLowerCase()}`, r, CACHE_TTL_SEC);
    }
  }

  return res.json({ results });
}

/**
 * Helper to check in your form submission controller if the location was actually in the search results list
 */
export async function isLocationFromVerifiedList(locationStr, selectionToken, lat, lon) {
  if (typeof locationStr !== 'string' || !locationStr.trim()) return false;
  const clean = locationStr.trim();

  // 1. Check cryptographic token if frontend sends it back
  if (selectionToken) {
    const expected = signLocationToken(clean, lat ?? '', lon ?? '');
    if (selectionToken === expected) return true;
  }

  // 2. Check if this exact formatted string was served by searchIndonesianLocations or reverseGeocodeLocation
  const verified = await getCache(`geo:verified:${clean.toLowerCase()}`);
  if (verified) return true;

  // 3. Fallback structural check
  return isValidIndonesianLocation(clean);
}

/**
 * GET /api/location/reverse?lat=...&lng=...
 * Used when the user taps "Allow to identify location"
 */
export async function reverseGeocodeLocation(req, res) {
  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng ?? req.query?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng coordinates are required.' });
  }

  if (!isWithinIndonesiaBounds(lat, lng)) {
    return res.status(422).json({
      error: 'Detected coordinates are outside the Indonesia deployment area.',
    });
  }

  const cacheKey = `geo:rev:v2:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // 1. Primary: Nominatim Reverse Geocode
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Kalceria-Platform/1.0 (contact@kalceria.com)',
        'Accept-Language': 'id,en',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.street || addr.residential || '';
      const suburb = addr.suburb || addr.village || addr.neighbourhood || '';
      const city = addr.city || addr.town || addr.municipality || addr.county || addr.city_district || '';
      const province = addr.state || addr.province || addr.region || '';

      const built = buildStandardLocation({ road, suburb, city, province, lat, lon: lng });
      const responseData = { ...built, lng };

      await setCache(cacheKey, responseData, CACHE_TTL_SEC);
      await setCache(`geo:verified:${built.formatted.toLowerCase()}`, responseData, CACHE_TTL_SEC);
      return res.json(responseData);
    }
  } catch {}

  // 2. Secondary Fallback: Photon Reverse Geocode (never fake Depok!)
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);

    const resp = await fetch(photonUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      const p = data?.features?.[0]?.properties;
      if (p) {
        const built = buildStandardLocation({
          road: p.street || p.name || '',
          suburb: p.district || p.locality || '',
          city: p.city || p.county || '',
          province: p.state || '',
          lat,
          lon: lng,
        });
        const responseData = { ...built, lng };
        await setCache(cacheKey, responseData, CACHE_TTL_SEC);
        await setCache(`geo:verified:${built.formatted.toLowerCase()}`, responseData, CACHE_TTL_SEC);
        return res.json(responseData);
      }
    }
  } catch {}

  // 3. Honest error response if both geocoders are unreachable
  return res.status(503).json({
    error: 'Unable to automatically resolve street address right now. Please search and select your street from the list.',
  });
}
