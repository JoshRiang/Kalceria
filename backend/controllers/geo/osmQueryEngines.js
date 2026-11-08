import crypto from 'node:crypto';
import { signLocationToken, ID_BOUNDS } from './geoConstants.js';
import { resolveAccurateProvince } from './addressParser.js';

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
export async function fetchPhoton(candidate, deconstructed) {
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

export async function fetchNominatim(candidate, deconstructed) {
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
