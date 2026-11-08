import { INDONESIAN_PROVINCES } from './geoConstants.js';

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
