import { INDONESIAN_CITY_INDEX } from './indonesianCityData.js';
import { normalizeCityKey, buildCityResponseObject } from './cityCryptoAndCache.js';

export const PRECOMPUTED_ID_CITIES = INDONESIAN_CITY_INDEX.map((entry) => ({
  ...entry,
  normName: normalizeCityKey(entry.name),
  normAliases: (entry.aliases || []).map((a) => normalizeCityKey(a)),
}));

/**
 * Matches a single candidate string against the Indonesia priority index.
 */
export function matchIndonesianCity(rawCandidate) {
  const norm = normalizeCityKey(rawCandidate);
  if (!norm || norm.length < 3) return null;

  // 1. Exact canonical name match
  for (const item of PRECOMPUTED_ID_CITIES) {
    if (item.normName === norm || item.normName.replace(/\s+/g, '') === norm.replace(/\s+/g, '')) {
      return buildCityResponseObject({
        name: item.name,
        country: 'Indonesia',
        countryCode: 'ID',
        region: item.province,
        lat: item.lat,
        lng: item.lng,
      });
    }
  }

  // 2. Exact alias / district->city match
  for (const item of PRECOMPUTED_ID_CITIES) {
    if (item.normAliases.some((al) => al === norm)) {
      return buildCityResponseObject({
        name: item.name,
        country: 'Indonesia',
        countryCode: 'ID',
        region: item.province,
        lat: item.lat,
        lng: item.lng,
      });
    }
  }

  // 3. Substring scan ordered by longest canonical/alias name first (so "Tangerang Selatan" beats "Tangerang")
  let best = null;
  let bestLen = 0;
  for (const item of PRECOMPUTED_ID_CITIES) {
    const terms = [item.normName, ...item.normAliases];
    for (const term of terms) {
      if (term.length < 4) continue;
      const wordBoundaryRegex = new RegExp(`(?:^|\\b)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\b|$)`, 'i');
      if (wordBoundaryRegex.test(norm) && term.length > bestLen) {
        best = item;
        bestLen = term.length;
      }
    }
  }

  if (best) {
    return buildCityResponseObject({
      name: best.name,
      country: 'Indonesia',
      countryCode: 'ID',
      region: best.province,
      lat: best.lat,
      lng: best.lng,
    });
  }

  return null;
}
