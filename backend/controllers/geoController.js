import { redis } from '../lib/redis.js';

// All 38 Provinces of Indonesia
export const INDONESIAN_PROVINCES = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Kepulauan Bangka Belitung',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'Daerah Istimewa Yogyakarta',
  'Jawa Timur',
  'Banten',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Gorontalo',
  'Sulawesi Tengah',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya',
];

// Curated Indonesian Major Roads, Hubs & Cities for Instant Matching (<1ms)
const CURATED_LOCATIONS = [
  // Depok & Greater Jakarta
  { name: 'Jl. Margonda Raya', city: 'Kota Depok', province: 'Jawa Barat' },
  { name: 'Jl. Ir. H. Juanda', city: 'Kota Depok', province: 'Jawa Barat' },
  { name: 'Jl. Raya Sawangan', city: 'Kota Depok', province: 'Jawa Barat' },
  { name: 'Jl. Raya Bogor', city: 'Kota Depok', province: 'Jawa Barat' },
  { name: 'Jl. Akses UI', city: 'Kota Depok', province: 'Jawa Barat' },
  { name: 'Jl. Cinere Raya', city: 'Kota Depok', province: 'Jawa Barat' },
  { name: 'Jl. Jenderal Sudirman', city: 'Jakarta Pusat', province: 'DKI Jakarta' },
  { name: 'Jl. M.H. Thamrin', city: 'Jakarta Pusat', province: 'DKI Jakarta' },
  { name: 'Jl. Gatot Subroto', city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  { name: 'Jl. H.R. Rasuna Said', city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  { name: 'Jl. Senopati', city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  { name: 'Jl. Kemang Raya', city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  { name: 'Jl. TB Simatupang', city: 'Jakarta Selatan', province: 'DKI Jakarta' },
  { name: 'Jl. S. Parman', city: 'Jakarta Barat', province: 'DKI Jakarta' },
  { name: 'Jl. Panjang', city: 'Jakarta Barat', province: 'DKI Jakarta' },
  { name: 'Jl. Hayam Wuruk', city: 'Jakarta Barat', province: 'DKI Jakarta' },
  { name: 'Jl. Gajah Mada', city: 'Jakarta Pusat', province: 'DKI Jakarta' },
  { name: 'Jl. Pemuda', city: 'Jakarta Timur', province: 'DKI Jakarta' },
  { name: 'Jl. Danau Sunter Utara', city: 'Jakarta Utara', province: 'DKI Jakarta' },
  { name: 'Jl. Boulevard Kelapa Gading', city: 'Jakarta Utara', province: 'DKI Jakarta' },

  // Bandung & West Java
  { name: 'Jl. Asia Afrika', city: 'Kota Bandung', province: 'Jawa Barat' },
  { name: 'Jl. Ir. H. Djuanda (Dago)', city: 'Kota Bandung', province: 'Jawa Barat' },
  { name: 'Jl. R.E. Martadinata (Riau)', city: 'Kota Bandung', province: 'Jawa Barat' },
  { name: 'Jl. Braga', city: 'Kota Bandung', province: 'Jawa Barat' },
  { name: 'Jl. Setiabudi', city: 'Kota Bandung', province: 'Jawa Barat' },
  { name: 'Jl. Pajajaran', city: 'Kota Bogor', province: 'Jawa Barat' },
  { name: 'Jl. Surya Kencana', city: 'Kota Bogor', province: 'Jawa Barat' },
  { name: 'Jl. Ahmad Yani', city: 'Kota Bekasi', province: 'Jawa Barat' },
  { name: 'Jl. Bulevar Ahmad Yani (Summarecon)', city: 'Kota Bekasi', province: 'Jawa Barat' },
  { name: 'Jl. MH Thamrin (Lippo Cikarang)', city: 'Kabupaten Bekasi', province: 'Jawa Barat' },

  // Banten
  { name: 'Jl. BSD Grand Boulevard', city: 'Kota Tangerang Selatan', province: 'Banten' },
  { name: 'Jl. Boulevard Bintaro Jaya', city: 'Kota Tangerang Selatan', province: 'Banten' },
  { name: 'Jl. Daan Mogot', city: 'Kota Tangerang', province: 'Banten' },

  // Central Java & Yogyakarta
  { name: 'Jl. Malioboro', city: 'Kota Yogyakarta', province: 'Daerah Istimewa Yogyakarta' },
  { name: 'Jl. Kaliurang', city: 'Kabupaten Sleman', province: 'Daerah Istimewa Yogyakarta' },
  { name: 'Jl. Gejayan (Affandi)', city: 'Kabupaten Sleman', province: 'Daerah Istimewa Yogyakarta' },
  { name: 'Jl. Pandanaran', city: 'Kota Semarang', province: 'Jawa Tengah' },
  { name: 'Jl. Pemuda', city: 'Kota Semarang', province: 'Jawa Tengah' },
  { name: 'Jl. Slamet Riyadi', city: 'Kota Surakarta (Solo)', province: 'Jawa Tengah' },

  // East Java
  { name: 'Jl. Tunjungan', city: 'Kota Surabaya', province: 'Jawa Timur' },
  { name: 'Jl. Raya Darmo', city: 'Kota Surabaya', province: 'Jawa Timur' },
  { name: 'Jl. Mayjen Sungkono', city: 'Kota Surabaya', province: 'Jawa Timur' },
  { name: 'Jl. Basuki Rahmat', city: 'Kota Surabaya', province: 'Jawa Timur' },
  { name: 'Jl. Ijen', city: 'Kota Malang', province: 'Jawa Timur' },

  // Bali & Others
  { name: 'Jl. Sunset Road', city: 'Kabupaten Badung', province: 'Bali' },
  { name: 'Jl. Legian', city: 'Kabupaten Badung', province: 'Bali' },
  { name: 'Jl. By Pass Ngurah Rai', city: 'Kota Denpasar', province: 'Bali' },
  { name: 'Jl. Diponegoro', city: 'Kota Denpasar', province: 'Bali' },
  { name: 'Jl. Monkey Forest', city: 'Kabupaten Gianyar (Ubud)', province: 'Bali' },
  { name: 'Jl. Balikpapan Baru', city: 'Kota Balikpapan', province: 'Kalimantan Timur' },
  { name: 'Jl. Jenderal Sudirman', city: 'Kota Balikpapan', province: 'Kalimantan Timur' },
  { name: 'Jl. Somba Opu', city: 'Kota Makassar', province: 'Sulawesi Selatan' },
  { name: 'Jl. Penghibur', city: 'Kota Makassar', province: 'Sulawesi Selatan' },
  { name: 'Jl. Balai Kota', city: 'Kota Medan', province: 'Sumatera Utara' },
  { name: 'Jl. Gatot Subroto', city: 'Kota Medan', province: 'Sumatera Utara' },
];

// In-memory cache for location searches
const geoCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function formatIndonesianLocation(item) {
  const parts = [];
  if (item.name || item.road) parts.push(item.name || item.road);
  if (item.city) parts.push(item.city);
  if (item.province) parts.push(item.province);
  return parts.join(', ');
}

export function isValidIndonesianLocation(locationStr) {
  if (typeof locationStr !== 'string') return false;
  const clean = locationStr.trim();
  if (clean.length < 3 || clean.length > 300) return false;

  // Check if string contains at least one recognized Indonesian province or known city
  const lower = clean.toLowerCase();
  const hasProvince = INDONESIAN_PROVINCES.some((p) =>
    lower.includes(p.toLowerCase())
  );
  if (hasProvince) return true;

  const knownCities = [
    'depok', 'jakarta', 'bandung', 'bogor', 'bekasi', 'tangerang',
    'surabaya', 'semarang', 'yogyakarta', 'solo', 'surakarta', 'malang',
    'denpasar', 'badung', 'ubud', 'medan', 'palembang', 'makassar',
    'balikpapan', 'samarinda', 'padang', 'pekanbaru', 'batam', 'cirebon',
  ];
  return knownCities.some((c) => lower.includes(c));
}

export async function searchIndonesianLocations(req, res) {
  const query = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }

  const cacheKey = `geo:search:${query.toLowerCase()}`;
  const cached = geoCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return res.json({ results: cached.results });
  }

  // 1. Search Curated Database First (Instant <1ms)
  const qLower = query.toLowerCase();
  const curatedMatches = CURATED_LOCATIONS.filter((loc) => {
    const formatted = `${loc.name}, ${loc.city}, ${loc.province}`.toLowerCase();
    return formatted.includes(qLower);
  }).map((loc) => ({
    id: `curated-${loc.name}-${loc.city}`,
    formatted: `${loc.name}, ${loc.city}, ${loc.province}`,
    road: loc.name,
    city: loc.city,
    province: loc.province,
  }));

  // Also match pure provinces if queried
  const provinceMatches = INDONESIAN_PROVINCES.filter((p) =>
    p.toLowerCase().includes(qLower)
  ).map((p) => ({
    id: `province-${p}`,
    formatted: p,
    road: '',
    city: '',
    province: p,
  }));

  let combined = [...curatedMatches, ...provinceMatches];

  // 2. Fallback to Nominatim Free Tier if query has >= 3 chars and curated has < 4 results
  if (combined.length < 4 && query.length >= 3) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=id&limit=8&q=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);

      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Kalceria-Platform/1.0 (contact@kalceria.com)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        const nominatimResults = data
          .map((item) => {
            const addr = item.address || {};
            const road =
              addr.road || addr.pedestrian || addr.street || addr.highway || '';
            const city =
              addr.city ||
              addr.town ||
              addr.municipality ||
              addr.city_district ||
              addr.county ||
              '';
            const province = addr.state || addr.province || addr.region || '';

            // Stop cleanly at Province
            const parts = [];
            if (road) parts.push(road);
            if (city && city !== road) parts.push(city);
            if (province && province !== city) parts.push(province);

            const formatted = parts.join(', ') || item.display_name.split(',').slice(0, 3).join(', ');
            return {
              id: `osm-${item.place_id || item.osm_id}`,
              formatted,
              road,
              city,
              province,
              lat: item.lat,
              lon: item.lon,
            };
          })
          .filter((item) => item.formatted.length >= 5);

        // Deduplicate
        const seen = new Set(combined.map((c) => c.formatted.toLowerCase()));
        for (const nr of nominatimResults) {
          if (!seen.has(nr.formatted.toLowerCase())) {
            seen.add(nr.formatted.toLowerCase());
            combined.push(nr);
          }
        }
      }
    } catch {
      // Free tier Nominatim timeout or rate limit; smoothly rely on curated results
    }
  }

  const results = combined.slice(0, 10);
  geoCache.set(cacheKey, { results, expiry: Date.now() + CACHE_TTL_MS });

  res.json({ results });
}

export async function reverseGeocodeLocation(req, res) {
  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng required.' });
  }

  const cacheKey = `geo:rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = geoCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return res.json(cached.data);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Kalceria-Platform/1.0 (contact@kalceria.com)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.street || '';
      const city = addr.city || addr.town || addr.municipality || addr.city_district || addr.county || '';
      const province = addr.state || addr.province || addr.region || '';

      const parts = [];
      if (road) parts.push(road);
      if (city && city !== road) parts.push(city);
      if (province && province !== city) parts.push(province);

      const formatted = parts.join(', ') || data.display_name.split(',').slice(0, 3).join(', ');
      const responseData = { formatted, road, city, province, lat, lng };

      geoCache.set(cacheKey, { data: responseData, expiry: Date.now() + CACHE_TTL_MS });
      return res.json(responseData);
    }
  } catch {}

  // Fallback if reverse geocoding is unavailable
  const fallback = {
    formatted: 'Area Depok, Jawa Barat',
    city: 'Kota Depok',
    province: 'Jawa Barat',
    lat,
    lng,
  };
  res.json(fallback);
}
