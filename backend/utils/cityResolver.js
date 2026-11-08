import {
  INDONESIAN_CITY_INDEX,
  PRECOMPUTED_ID_CITIES,
  getCached,
  setCached,
  normalizeCityKey,
  signCityToken,
  verifyCityToken,
  buildCityResponseObject,
  cleanAddressNoise,
  matchIndonesianCity,
  queryWorldwidePhotonCities,
  queryWorldwideNominatimCities,
} from './cityResolver/index.js';

export {
  INDONESIAN_CITY_INDEX,
  normalizeCityKey,
  signCityToken,
  verifyCityToken,
  matchIndonesianCity,
};

/**
 * Searches Indonesian (prioritized #1) + Worldwide cities dynamically.
 */
export async function searchWorldwideAndIndonesianCities(rawQuery, { limit = 10, fetchImpl = fetch } = {}) {
  const q = String(rawQuery || '').trim();
  if (q.length < 2) return [];

  const normQ = normalizeCityKey(q);
  const cacheKey = `city:search:v1:${normQ}`;
  const cached = await getCached(cacheKey);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached.slice(0, limit);
  }

  // 1. Instant Indonesia Priority Matches
  const idPrefixMatches = [];
  const idContainsMatches = [];
  for (const item of PRECOMPUTED_ID_CITIES) {
    if (item.normName.startsWith(normQ)) {
      idPrefixMatches.push(
        buildCityResponseObject({
          name: item.name,
          country: 'Indonesia',
          countryCode: 'ID',
          region: item.province,
          lat: item.lat,
          lng: item.lng,
        })
      );
    } else if (
      item.normName.includes(normQ) ||
      item.normAliases.some((al) => al.startsWith(normQ))
    ) {
      idContainsMatches.push(
        buildCityResponseObject({
          name: item.name,
          country: 'Indonesia',
          countryCode: 'ID',
          region: item.province,
          lat: item.lat,
          lng: item.lng,
        })
      );
    }
  }

  // 2. Dynamic Worldwide Geocoder Query (Photon + Nominatim)
  const [photonCities, nominatimCities] = await Promise.all([
    queryWorldwidePhotonCities(q, fetchImpl),
    queryWorldwideNominatimCities(q, fetchImpl),
  ]);

  const dynamicIndonesia = [];
  const dynamicWorldwide = [];
  for (const c of [...photonCities, ...nominatimCities]) {
    if (c.isIndonesia) dynamicIndonesia.push(c);
    else dynamicWorldwide.push(c);
  }

  // Deduplicate while keeping Indonesia strictly prioritized first
  const ordered = [
    ...idPrefixMatches,
    ...idContainsMatches,
    ...dynamicIndonesia,
    ...dynamicWorldwide,
  ];

  const seen = new Set();
  const deduped = [];
  for (const item of ordered) {
    const key = `${normalizeCityKey(item.name)}|${item.countryCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    await setCached(`city:verified:v1:${normalizeCityKey(item.name)}`, item);
    await setCached(`city:verified:v1:${normalizeCityKey(item.label)}`, item);
    if (deduped.length >= Math.max(limit, 12)) break;
  }

  if (deduped.length > 0) {
    await setCached(cacheKey, deduped);
  }

  return deduped.slice(0, limit);
}

/**
 * Extracts a 4-digit Birth Year (YYYY) from Google People API birthdays or date strings.
 */
export function extractBirthYearFromGoogle(peopleOrClaims = {}) {
  const currentYear = new Date().getFullYear();
  const isValidYear = (y) => Number.isInteger(y) && y >= 1920 && y <= currentYear;

  // 1. Google People API birthdays array
  const birthdays = Array.isArray(peopleOrClaims?.birthdays) ? peopleOrClaims.birthdays : [];
  if (birthdays.length > 0) {
    // Prefer primary metadata entry that actually contains a 4-digit year
    const sorted = [...birthdays].sort(
      (a, b) => Number(Boolean(b?.metadata?.primary)) - Number(Boolean(a?.metadata?.primary))
    );
    for (const b of sorted) {
      const yearNum = Number(b?.date?.year);
      if (isValidYear(yearNum)) {
        return String(yearNum);
      }
      if (typeof b?.text === 'string') {
        const match = b.text.match(/\b(19\d{2}|20\d{2})\b/);
        if (match && isValidYear(Number(match[1]))) {
          return match[1];
        }
      }
    }
  }

  // 2. Fallback OIDC / string birthdate claim (e.g. "2001-08-17" or "17/08/2001")
  const rawStr = peopleOrClaims?.birthdate || peopleOrClaims?.birthday || peopleOrClaims?.dob || '';
  if (typeof rawStr === 'string' && rawStr.trim()) {
    const match = rawStr.trim().match(/\b(19\d{2}|20\d{2})\b/);
    if (match && isValidYear(Number(match[1]))) {
      return match[1];
    }
  }

  return '';
}

/**
 * Extracts and verifies the user's City (Kota) from Google People API full address(es),
 * prioritizing Indonesia first and dynamically resolving worldwide addresses cleanly.
 */
export async function resolveCityFromGoogleProfile(peopleData = {}, { fetchImpl = fetch } = {}) {
  const addresses = Array.isArray(peopleData?.addresses) ? peopleData.addresses : [];
  if (addresses.length === 0) return null;

  const sorted = [...addresses].sort((a, b) => {
    const aScore = (a?.metadata?.primary ? 2 : 0) + (String(a?.type || '').toLowerCase() === 'home' ? 1 : 0);
    const bScore = (b?.metadata?.primary ? 2 : 0) + (String(b?.type || '').toLowerCase() === 'home' ? 1 : 0);
    return bScore - aScore;
  });

  for (const addr of sorted) {
    const countryCode = String(addr?.countryCode || '').trim().toUpperCase();
    const country = String(addr?.country || '').trim();
    const rawCity = String(addr?.city || '').trim();
    const rawSublocality = String(addr?.sublocality || '').trim();
    const rawRegion = String(addr?.region || '').trim();
    const rawFormatted = String(addr?.formattedValue || '').trim();
    const rawStreet = String(addr?.streetAddress || '').trim();

    const looksIndonesian =
      countryCode === 'ID' ||
      /\bindonesia\b/i.test(country) ||
      /\bindonesia\b/i.test(rawFormatted) ||
      (!countryCode && !country && Boolean(matchIndonesianCity(`${rawCity} ${rawSublocality} ${rawRegion} ${rawFormatted}`)));

    // A. Indonesia Priority Extraction (Structured -> Sublocality -> Full Formatted Address)
    if (looksIndonesian) {
      for (const candidate of [rawCity, rawSublocality, `${rawCity} ${rawRegion}`, rawFormatted, rawStreet]) {
        if (!candidate) continue;
        const idCity = matchIndonesianCity(cleanAddressNoise(candidate));
        if (idCity) {
          await setCached(`city:verified:v1:${normalizeCityKey(idCity.name)}`, idCity);
          return idCity;
        }
      }
    }

    // B. Structured International / Unindexed Indonesian City via Dynamic Worldwide Resolver
    const structuredCandidates = [];
    if (rawCity) {
      const cleanedCity = cleanAddressNoise(rawCity)
        .replace(/-shi$/i, '')
        .trim();
      if (cleanedCity.length >= 2) {
        structuredCandidates.push(
          country ? `${cleanedCity}, ${country}` : cleanedCity,
          cleanedCity
        );
      }
    }

    // C. Parse comma/newline-delimited segments of formattedValue (from locality toward country)
    if (rawFormatted) {
      const segments = rawFormatted
        .split(/[,\n]+/)
        .map((s) => cleanAddressNoise(s))
        .filter((s) => s.length >= 2 && !/^(indonesia|japan|singapore\s+\d+|malaysia|australia|united\s+states|usa|uk|united\s+kingdom)$/i.test(s));

      // Check if any segment matches an Indonesian city first
      for (const seg of segments) {
        const idCity = matchIndonesianCity(seg);
        if (idCity) {
          await setCached(`city:verified:v1:${normalizeCityKey(idCity.name)}`, idCity);
          return idCity;
        }
      }

      // Otherwise add locality-level segments (typically near the end before region/country)
      for (let i = Math.max(0, segments.length - 3); i < segments.length; i++) {
        const seg = segments[i].replace(/-shi$/i, '').trim();
        if (seg.length >= 2) {
          structuredCandidates.push(country ? `${seg}, ${country}` : seg, seg);
        }
      }
    }

    for (const query of structuredCandidates) {
      const found = await searchWorldwideAndIndonesianCities(query, { limit: 3, fetchImpl });
      if (found.length > 0) {
        return found[0];
      }
    }
  }

  return null;
}

/**
 * Resolves & validates a city string + coordinates during registration.
 */
export async function resolveAndValidateCity(
  rawDomicile,
  { domicileLat, domicileLng, cityToken, fetchImpl = fetch } = {}
) {
  const clean = String(rawDomicile || '').trim();
  if (!clean) {
    return { valid: false, coords: [0, 0], city: null };
  }

  // 1. Check Indonesia Priority Index first (0ms)
  const idMatch = matchIndonesianCity(clean);
  if (idMatch) {
    const lat = Number.isFinite(Number(domicileLat)) && Number(domicileLat) !== 0 ? Number(domicileLat) : idMatch.lat;
    const lng = Number.isFinite(Number(domicileLng)) && Number(domicileLng) !== 0 ? Number(domicileLng) : idMatch.lng;
    return { valid: true, coords: [lat, lng], city: idMatch };
  }

  // 2. Check cryptographic cityToken if provided by autocomplete / Google prefill
  if (cityToken && verifyCityToken(clean, domicileLat, domicileLng, cityToken)) {
    return {
      valid: true,
      coords: [Number(domicileLat) || 0, Number(domicileLng) || 0],
      city: buildCityResponseObject({
        name: clean.split(',')[0].trim(),
        country: clean.includes(',') ? clean.split(',').slice(1).join(',').trim() : '',
        countryCode: 'WW',
        lat: domicileLat,
        lng: domicileLng,
      }),
    };
  }

  // 3. Check Redis/Memory verified cache
  const norm = normalizeCityKey(clean);
  const cached = await getCached(`city:verified:v1:${norm}`);
  if (cached) {
    return {
      valid: true,
      coords: [cached.lat || 0, cached.lng || 0],
      city: cached,
    };
  }

  // 4. Live dynamic lookup against Worldwide + Indonesia City Search
  const matches = await searchWorldwideAndIndonesianCities(clean, { limit: 5, fetchImpl });
  const exactOrClose = matches.find((m) => {
    const mName = normalizeCityKey(m.name);
    const mLabel = normalizeCityKey(m.label);
    return mName === norm || mLabel === norm || (norm.length >= 4 && mName.startsWith(norm));
  });

  if (exactOrClose) {
    return {
      valid: true,
      coords: [exactOrClose.lat || 0, exactOrClose.lng || 0],
      city: exactOrClose,
    };
  }

  return { valid: false, coords: [0, 0], city: null };
}

// Express Route Handler: GET /api/location/cities?q=...
export async function searchCitiesEndpoint(req, res) {
  const rawQuery = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (!rawQuery || rawQuery.length < 2 || rawQuery.length > 120) {
    return res.json({ cities: [] });
  }
  const cities = await searchWorldwideAndIndonesianCities(rawQuery, { limit: 10 });
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.json({ cities });
}
