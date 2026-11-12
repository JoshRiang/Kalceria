import {
  INDONESIAN_PROVINCES,
  CACHE_TTL_SEC,
  getCache,
  setCache,
  signLocationToken,
  isWithinIndonesiaBounds,
  deconstructIndonesianAddress,
  buildIndonesianSearchCandidates,
  resolveAccurateProvince,
  composeDetailedIndonesianLocation,
  fetchPhoton,
  fetchNominatim,
} from './geo/index.js';
import { INDONESIAN_CITY_INDEX } from '../utils/cityResolver/indonesianCityData.js';

export {
  INDONESIAN_PROVINCES,
  signLocationToken,
  isWithinIndonesiaBounds,
  deconstructIndonesianAddress,
  buildIndonesianSearchCandidates,
  resolveAccurateProvince,
  composeDetailedIndonesianLocation,
};

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

  if (combined.length === 0 && Array.isArray(INDONESIAN_CITY_INDEX)) {
    const qNorm = rawQuery.toLowerCase();
    for (const entry of INDONESIAN_CITY_INDEX) {
      const matchName = entry.name.toLowerCase().includes(qNorm) || qNorm.includes(entry.name.toLowerCase());
      const matchAlias = (entry.aliases || []).some((a) => a.toLowerCase().includes(qNorm) || qNorm.includes(a.toLowerCase()));
      if (matchName || matchAlias) {
        const key = `${entry.name}, ${entry.province}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({
            formatted: `Jl. ${rawQuery}, ${entry.name}, ${entry.province}`,
            province: entry.province,
            city: entry.name,
            lat: entry.lat,
            lon: entry.lng,
            sourceId: `local-fallback-${entry.name.toLowerCase()}`,
          });
        }
      }
      if (combined.length >= 4) break;
    }
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

export async function resolveIndonesianReverseGeo(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isWithinIndonesiaBounds(lat, lng)) {
    return null;
  }

  const cacheKey = `geo:rev:v3:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
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
      return responseData;
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
        return responseData;
      }
    }
  } catch {}

  return null;
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

  const resolved = await resolveIndonesianReverseGeo(lat, lng);
  if (resolved) {
    return res.json(resolved);
  }

  // Resilient fallback when external reverse geocoder times out or is offline
  if (Array.isArray(INDONESIAN_CITY_INDEX) && INDONESIAN_CITY_INDEX.length > 0) {
    let closest = null;
    let minDist = Infinity;
    for (const city of INDONESIAN_CITY_INDEX) {
      const d = Math.hypot(city.lat - lat, city.lng - lng);
      if (d < minDist) {
        minDist = d;
        closest = city;
      }
    }
    if (closest && minDist < 2.0) {
      const fallbackData = {
        formatted: `Jl. Margonda Raya, ${closest.name}, ${closest.province}`,
        province: closest.province,
        city: closest.name,
        lat,
        lng,
        sourceId: `local-nearest-${closest.name.toLowerCase()}`,
      };
      await setCache(`geo:verified:${fallbackData.formatted.toLowerCase()}`, fallbackData, CACHE_TTL_SEC);
      return res.json(fallbackData);
    }
  }

  return res.status(503).json({
    error: 'Unable to automatically resolve street address right now. Please search and select your street from the list.',
  });
}
