import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';

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

const ID_BOUNDS = { minLat: -11.2, maxLat: 6.2, minLon: 94.9, maxLon: 141.1 };
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

/**
 * 1. DECONSTRUCTOR:
 * Splits "Perumahan Green Permata, Blok Olive 9, Pesanggrahan" into:
 * - estateOrComplex: "Perumahan Green Permata"
 * - microUnit: "Blok Olive 9"
 * - searchCandidates: ordered from most specific to broadest so OSM doesn't choke on "Blok Olive 9"
 */
export function deconstructIndonesianAddress(rawQuery) {
  const raw = String(rawQuery || '').trim();
  if (!raw) return { raw: '', estateOrComplex: '', microUnit: '', searchCandidates: [] };

  // Extract micro-unit details (Blok X, No. Y, RT/RW, Kavling, Lantai)
  const microRegex =
    /\b((?:blok|block|no|nomor|rt|rw|kav|kavling|unit|lt|lantai)\b\s*[.:/-]?\s*[a-z0-9]+(?:\s+[a-z0-9/-]+)?)/gi;
  const microMatches = [];
  let match;
  while ((match = microRegex.exec(raw)) !== null) {
    microMatches.push(match[1].trim());
  }
  const microUnit = microMatches.join(', ');

  // Extract explicit Estate / Perumahan / Cluster / Apartemen name if typed by user
  const estateRegex =
    /\b((?:perumahan|perum|komplek|komp|cluster|apartemen|apt|villa|graha|griyo|griya|pesona|taman)\s+[a-z0-9\s.'-]+?)(?=,|$|\b(?:blok|no|rt|rw|jl|jalan)\b)/i;
  const estateMatch = raw.match(estateRegex);
  const estateOrComplex = estateMatch ? estateMatch[1].trim() : '';

  // Remove micro-unit details (like "Blok Olive 9") from the geocoder search string
  // because OSM does not index individual block numbers
  const withoutMicro = raw
    .replace(microRegex, '')
    .replace(/\b(?:jl|jln)\.?\s+/gi, 'Jalan ')
    .replace(/\bgg\.?\s+/gi, 'Gang ')
    .replace(/,\s*,+/g, ',')
    .replace(/^,\s*|\s*,\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip the word "Perumahan/Komplek/Cluster" for an alternative search candidate
  // because OSM often names the polygon "Green Permata" instead of "Perumahan Green Permata"
  const coreNameQuery = withoutMicro
    .replace(/\b(?:perumahan|perum|komplek|komp|cluster)\s+/gi, '')
    .trim();

  // Also split comma segments so if "Green Permata, Pesanggrah" fails, we can search "Green Permata" and "Pesanggrah"
  const segments = withoutMicro
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  const candidates = new Set();
  if (withoutMicro.length >= 2) candidates.add(withoutMicro);
  if (coreNameQuery.length >= 2) candidates.add(coreNameQuery);

  // If user typed "Perumahan Green Permata, Pesanggrah", try the first segment ("Green Permata")
  // and last segment ("Pesanggrah") if full string yields few matches
  if (segments.length >= 2) {
    const firstCore = segments[0].replace(/\b(?:perumahan|perum|komplek|cluster)\s+/gi, '').trim();
    if (firstCore.length >= 3) candidates.add(firstCore);
    candidates.add(`${firstCore} ${segments[segments.length - 1]}`);
    candidates.add(segments[segments.length - 1]);
  }

  // Also extract "Jalan ..." street name if present
  const jalanMatch = withoutMicro.match(/\b(Jalan\s+[a-z0-9\s.'-]+?)(?=,|$)/i);
  if (jalanMatch && jalanMatch[1].trim().length >= 5) {
    candidates.add(jalanMatch[1].trim());
  }

  return {
    raw,
    estateOrComplex,
    microUnit,
    searchCandidates: Array.from(candidates),
  };
}

/**
 * Builds search candidates for geocoding queries, maintaining backwards compatibility
 */
export function buildIndonesianSearchCandidates(rawInput) {
  const raw = String(rawInput || '').trim();
  if (!raw) return [];

  // Special shortcut: "Jl" -> "Jalan Raya" for quick autocomplete
  if (/^jl\.?$/i.test(raw)) {
    return ['Jalan Raya'];
  }

  const deconstructed = deconstructIndonesianAddress(raw);
  const candidates = new Set(deconstructed.searchCandidates);

  // Progressive cleaner: replace "Jl" with "Jalan", strip RT/RW and No.
  const cleaned = raw
    .replace(/\b(?:jl|jln)\.?\s+/gi, 'Jalan ')
    .replace(/\b(?:rt|rw)\s*\/?\s*\d+\s*\/?\s*\d*/gi, '')
    .replace(/\bno\.?\s*\d+[a-z]?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length >= 3) {
    candidates.add(cleaned);
  }

  // Extract core street if "Jalan ..." exists
  const streetMatch = cleaned.match(/Jalan\s+[a-z0-9\s]+?(?=,|$)/i);
  if (streetMatch && streetMatch[0].trim().length >= 5) {
    candidates.add(streetMatch[0].trim());
  }

  return Array.from(candidates);
}

/**
 * Fixes province mismatches (like Jakarta Selatan showing "Banten")
 */
export function resolveAccurateProvince(rawProvince, city = '', district = '') {
  const combined = `${city} ${district} ${rawProvince}`.toLowerCase();

  // Strict override: Any Jakarta administrative city/kecamatan is ALWAYS DKI Jakarta
  if (
    /jakarta\s+(selatan|pusat|barat|timur|utara)|kepulauan\s+seribu|pesanggrahan|kebayoran|cilandak|tebet|setiabudi|mampang|pancoran|jagakarsa|pasar\s+minggu/i.test(
      combined
    )
  ) {
    return 'DKI Jakarta';
  }
  if (/kota\s+depok|kota\s+bekasi|kabupaten\s+bekasi|kota\s+bogor|kabupaten\s+bogor|kota\s+bandung/i.test(combined)) {
    return 'Jawa Barat';
  }
  if (/tangerang|cilegon|serang|lebakk|pandeglang/i.test(combined)) {
    return 'Banten';
  }
  if (/yogyakarta|sleman|bantul|kulon\s+progo|gunung\s+kidul/i.test(combined)) {
    return 'Daerah Istimewa Yogyakarta';
  }

  const pLower = String(rawProvince || '').toLowerCase();
  const found = INDONESIAN_PROVINCES.find(
    (p) => p.toLowerCase() === pLower || pLower.includes(p.toLowerCase())
  );
  return found || rawProvince || '';
}

/**
 * 2. FULL HIERARCHY EXTRACTOR + RE-COMPOSITOR:
 * Extracts Perumahan -> Jalan -> Kelurahan -> Kecamatan -> Kota -> Provinsi
 * AND re-attaches the user's "Blok Olive 9" / "Perumahan Green Permata" so nothing is lost.
 */
export function composeDetailedIndonesianLocation(osmData, deconstructed = {}) {
  const {
    name = '',
    road = '',
    residential = '',
    neighbourhood = '',
    kelurahan = '',
    kecamatan = '',
    city = '',
    province = '',
    lat = 0,
    lon = 0,
    sourceId,
  } = osmData;

  const { estateOrComplex = '', microUnit = '' } = deconstructed;
  const trueProvince = resolveAccurateProvince(province, city, kecamatan);

  // Determine the most specific place/estate name
  // Priority: 1. OSM residential/estate name, 2. User's typed "Perumahan X"
  let primaryPlace = residential || neighbourhood || name || '';
  if (
    estateOrComplex &&
    (!primaryPlace ||
      primaryPlace.toLowerCase() === kecamatan.toLowerCase() ||
      primaryPlace.toLowerCase() === kelurahan.toLowerCase())
  ) {
    primaryPlace = estateOrComplex;
  }

  // Build Headline (Line 1 in dropdown):
  // e.g. "Perumahan Green Permata, Blok Olive 9" or "Perumahan Green Permata, Jl. Swadarma Raya"
  const headlineParts = [];
  if (primaryPlace) headlineParts.push(primaryPlace);
  if (microUnit && !primaryPlace.toLowerCase().includes(microUnit.toLowerCase())) {
    headlineParts.push(microUnit);
  }
  if (road && road.toLowerCase() !== primaryPlace.toLowerCase()) {
    headlineParts.push(road);
  }

  // Build Administrative Subtitle (Line 2 in dropdown, stopping cleanly at Province):
  // e.g. "Ulujami, Kec. Pesanggrahan, Kota Jakarta Selatan, DKI Jakarta"
  const adminParts = [];
  if (kelurahan) adminParts.push(kelurahan);
  if (kecamatan && kecamatan.toLowerCase() !== kelurahan.toLowerCase()) {
    adminParts.push(kecamatan.startsWith('Kec.') ? kecamatan : `Kec. ${kecamatan}`);
  }
  if (
    city &&
    city.toLowerCase() !== kecamatan.toLowerCase() &&
    !city.toLowerCase().includes('daerah khusus ibukota')
  ) {
    adminParts.push(city);
  }
  if (trueProvince) {
    adminParts.push(trueProvince);
  }

  // Deduplicate across headline and adminParts
  const headline = headlineParts.join(', ') || adminParts[0] || '';
  const subtitle = adminParts.filter((p) => p.toLowerCase() !== headline.toLowerCase()).join(', ');
  const fullFormatted = [headline, subtitle].filter(Boolean).join(', ');

  const token = signLocationToken(fullFormatted, lat, lon);

  return {
    id: sourceId || `id-${crypto.createHash('md5').update(fullFormatted).digest('hex').slice(0, 10)}`,
    headline,
    subtitle,
    formatted: fullFormatted,
    selectionToken: token,
    estate: primaryPlace,
    unit: microUnit,
    road,
    kelurahan,
    kecamatan,
    city,
    province: trueProvince,
    lat: Number(lat),
    lon: Number(lon),
  };
}

/**
 * 3. MULTI-ENGINE FREE QUERIES (Photon for Prefix Autocomplete + Nominatim for Deep Address Details)
 */
async function fetchPhoton(candidate, deconstructed) {
  const bbox = `${ID_BOUNDS.minLon},${ID_BOUNDS.minLat},${ID_BOUNDS.maxLon},${ID_BOUNDS.maxLat}`;
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(candidate)}&bbox=${bbox}&limit=6`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || [])
      .filter((f) => !f.properties?.countrycode || f.properties.countrycode.toUpperCase() === 'ID')
      .map((f) => {
        const p = f.properties || {};
        const [lon, lat] = f.geometry?.coordinates || [];
        return composeDetailedIndonesianLocation(
          {
            name: p.name || '',
            road: p.street || '',
            residential: p.osm_key === 'landuse' ? p.name : '',
            neighbourhood: p.district || '',
            kelurahan: p.locality || '',
            kecamatan: p.district || '',
            city: p.city || p.county || '',
            province: p.state || '',
            lat,
            lon,
            sourceId: `photon-${p.osm_id}`,
          },
          deconstructed
        );
      });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNominatim(candidate, deconstructed) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&countrycodes=id&limit=6&q=${encodeURIComponent(candidate)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Kalceria-Platform/1.0 (contact@kalceria.com)',
        'Accept-Language': 'id,en',
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((item) => {
      const a = item.address || {};
      return composeDetailedIndonesianLocation(
        {
          name: item.name || item.namedetails?.name || '',
          residential: a.residential || a.neighbourhood || a.quarter || a.hamlet || '',
          road: a.road || a.pedestrian || a.street || a.footway || '',
          kelurahan: a.village || a.suburb || '',
          kecamatan: a.city_district || a.municipality || a.town || '',
          city: a.city || a.county || a.state_district || '',
          province: a.state || a.province || a.region || '',
          lat: item.lat,
          lon: item.lon,
          sourceId: `osm-${item.place_id}`,
        },
        deconstructed
      );
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validates whether a submitted location is an authentic Indonesian location.
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

  // Reject gibberish without comma-separated structure
  const segments = clean.split(',').map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) return false;

  const lastSegment = segments[segments.length - 1].toLowerCase();
  const secondLastSegment = segments.length >= 2 ? segments[segments.length - 2].toLowerCase() : '';

  const matchesProvince = INDONESIAN_PROVINCES.some((prov) => {
    const pLow = prov.toLowerCase();
    return lastSegment === pLow || secondLastSegment === pLow || lastSegment.includes(pLow);
  });

  if (!matchesProvince) return false;

  const firstSegment = segments[0];
  if (!/^[a-zA-Z0-9\s.,'()/-]{3,}$/.test(firstSegment)) return false;

  return true;
}

/**
 * 4. MAIN SEARCH CONTROLLER
 */
export async function searchIndonesianLocations(req, res) {
  const rawQuery = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (!rawQuery || rawQuery.length < 2) {
    return res.json({ results: [] });
  }

  const cacheKey = `geo:search:v3:${rawQuery.toLowerCase()}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json({ results: cached });
  }

  const deconstructed = deconstructIndonesianAddress(rawQuery);
  const combined = [];
  const seen = new Set();

  for (const candidate of deconstructed.searchCandidates) {
    const [photonResults, nominatimResults] = await Promise.all([
      fetchPhoton(candidate, deconstructed),
      fetchNominatim(candidate, deconstructed),
    ]);

    for (const item of [...nominatimResults, ...photonResults]) {
      if (!item.province) continue;
      const key = item.formatted.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }

    if (combined.length >= 4) break;
  }

  const results = combined.slice(0, 8);

  if (results.length > 0) {
    await setCache(cacheKey, results, CACHE_TTL_SEC);
    for (const r of results) {
      await setCache(`geo:verified:${r.formatted.toLowerCase()}`, r, CACHE_TTL_SEC);
    }
  }

  return res.json({ results });
}

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

  const cacheKey = `geo:rev:v3:${lat.toFixed(4)},${lng.toFixed(4)}`;
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
      const a = data.address || {};
      const deconstructed = { estateOrComplex: '', microUnit: '' };
      const built = composeDetailedIndonesianLocation(
        {
          name: a.residential || a.building || a.neighbourhood || '',
          road: a.road || a.pedestrian || a.street || a.residential || '',
          kelurahan: a.village || a.suburb || '',
          kecamatan: a.city_district || a.municipality || a.town || '',
          city: a.city || a.county || '',
          province: a.state || a.province || '',
          lat,
          lon: lng,
          sourceId: `osm-rev-${data.place_id || ''}`,
        },
        deconstructed
      );
      const responseData = { ...built, lng };

      await setCache(cacheKey, responseData, CACHE_TTL_SEC);
      await setCache(`geo:verified:${built.formatted.toLowerCase()}`, responseData, CACHE_TTL_SEC);
      return res.json(responseData);
    }
  } catch {}

  // 2. Secondary Fallback: Photon Reverse Geocode
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
        const deconstructed = { estateOrComplex: '', microUnit: '' };
        const built = composeDetailedIndonesianLocation(
          {
            name: p.name || '',
            road: p.street || '',
            kelurahan: p.locality || '',
            kecamatan: p.district || '',
            city: p.city || p.county || '',
            province: p.state || '',
            lat,
            lon: lng,
            sourceId: `photon-rev-${p.osm_id || ''}`,
          },
          deconstructed
        );
        const responseData = { ...built, lng };
        await setCache(cacheKey, responseData, CACHE_TTL_SEC);
        await setCache(`geo:verified:${built.formatted.toLowerCase()}`, responseData, CACHE_TTL_SEC);
        return res.json(responseData);
      }
    }
  } catch {}

  return res.status(503).json({
    error: 'Unable to automatically resolve street address right now. Please search and select your street from the list.',
  });
}
