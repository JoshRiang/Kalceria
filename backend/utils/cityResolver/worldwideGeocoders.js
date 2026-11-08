import { buildCityResponseObject } from './cityCryptoAndCache.js';
import { matchIndonesianCity } from './indonesianCityMatcher.js';

/**
 * Dynamic Worldwide City Search via OpenStreetMap Photon + Nominatim (Zero Hardcoding)
 */
export async function queryWorldwidePhotonCities(query, fetchImpl = fetch) {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
    `&osm_tag=place:city&osm_tag=place:town&osm_tag=place:municipality&limit=10&lang=en`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) return [];
    const data = await res.json();
    const out = [];
    for (const f of data?.features || []) {
      const p = f?.properties || {};
      const rawCity = p.name || p.city || p.county || '';
      if (!rawCity || rawCity.length < 2) continue;
      const [lon, lat] = f?.geometry?.coordinates || [0, 0];
      const countryCode = String(p.countrycode || '').toUpperCase() || 'XX';
      const country = p.country || (countryCode === 'ID' ? 'Indonesia' : '');
      const region = p.state || p.county || '';
      if (countryCode === 'ID') {
        const idMatch = matchIndonesianCity(rawCity);
        if (idMatch) {
          out.push(idMatch);
          continue;
        }
      }
      out.push(
        buildCityResponseObject({
          name: rawCity,
          country,
          countryCode,
          region,
          lat,
          lng: lon,
        })
      );
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function queryWorldwideNominatimCities(query, fetchImpl = fetch) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1` +
    `&featuretype=city&limit=8&q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2200);
  try {
    const res = await fetchImpl(url, {
      headers: {
        'User-Agent': 'Kalceria-Platform/1.0 (contact@kalceria.id)',
        'Accept-Language': 'id,en',
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const items = await res.json();
    const out = [];
    for (const item of items || []) {
      const a = item?.address || {};
      const rawCity =
        a.city ||
        a.town ||
        a.municipality ||
        a.city_district ||
        a.county ||
        item.name ||
        '';
      if (!rawCity || rawCity.length < 2) continue;
      const countryCode = String(a.country_code || '').toUpperCase() || 'XX';
      const country = a.country || (countryCode === 'ID' ? 'Indonesia' : '');
      const region = a.state || a.province || a.region || '';
      if (countryCode === 'ID') {
        const idMatch = matchIndonesianCity(rawCity);
        if (idMatch) {
          out.push(idMatch);
          continue;
        }
      }
      out.push(
        buildCityResponseObject({
          name: rawCity,
          country,
          countryCode,
          region,
          lat: item.lat,
          lng: item.lon,
        })
      );
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
