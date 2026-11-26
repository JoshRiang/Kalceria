/**
 * Pulau Jawa & Indonesian Street / Navigation Pronunciation Normalizer (Pure Module).
 *
 * Converts raw OSM / OSRM / TomTom road names, toll shields, abbreviations, distances,
 * and roundabout exit ordinals into natural Indonesian text ready for Neural TTS (Piper ONNX).
 */

const ROAD_ABBREV_RULES = [
  [/\bJln\.?\s+/gi, 'Jalan '],
  [/\bJl\.?\s+/gi, 'Jalan '],
  [/\bGg\.?\s+/gi, 'Gang '],
  [/\bLetjend?\.?\s+/gi, 'Letnan Jenderal '],
  [/\bMayjend?\.?\s+/gi, 'Mayor Jenderal '],
  [/\bBrigjend?\.?\s+/gi, 'Brigadir Jenderal '],
  [/\bJend\.?\s+/gi, 'Jenderal '],
  [/\bKol\.?\s+/gi, 'Kolonel '],
  [/\bKapt\.?\s+/gi, 'Kapten '],
  [/\bProf\.?\s+/gi, 'Profesor '],
  [/\bDrs\.?\s+/gi, 'Doktorandus '],
  [/\bDr\.?\s+/gi, 'Dokter '],
  [/\bIr\.?\s+/gi, 'Insinyur '],
  [/\bKH\.?\s+/gi, 'Kiai Haji '],
  [/\bH\.?\s+/gi, 'Haji '],
  [/\bHj\.?\s+/gi, 'Hajah '],
  [/\bSt\.?\s+/gi, 'Stasiun '],
  [/\bHlt\.?\s+/gi, 'Halte '],
  [/\bSimp\.?\s+/gi, 'Simpang '],
  [/\bBund\.?\s+/gi, 'Bundaran '],
  [/\bPerum\.?\s+/gi, 'Perumahan '],
  [/\bKomp\.?\s+/gi, 'Kompleks '],
  [/\bKec\.?\s+/gi, 'Kecamatan '],
  [/\bKel\.?\s+/gi, 'Kelurahan '],
  [/\bKab\.?\s+/gi, 'Kabupaten '],
  [/\bRSUD\b/g, 'Rumah Sakit Umum Daerah'],
  [/\bRSUP\b/g, 'Rumah Sakit Umum Pusat'],
  [/\bSPBU\b/g, 'Es Pe Be U'],
  [/\bJORR\b/gi, 'Jor'],
  [/\bMBZ\b/gi, 'Em Be Zet'],
  [/\bDKI\b/g, 'De Ka I'],
  [/\bDIY\b/g, 'De I Ye'],
  [/\bBundaran HI\b/gi, 'Bundaran Ha I'],
  [/\bKRL\b/g, 'Ka Er El'],
  [/\bMRT\b/g, 'Em Er Te'],
  [/\bLRT\b/g, 'El Er Te'],
  [/\bTB\s+Simatupang\b/gi, 'Te Be Simatupang'],
  [/\bMT\s+Haryono\b/gi, 'Em Te Haryono'],
  [/\bHR\s+Rasuna\b/gi, 'Ha Er Rasuna'],
  [/\bWR\s+Supratman\b/gi, 'We Er Supratman'],
  [/\bKm\.?\s*(\d+)/gi, 'kilometer $1'],
  [/\bNo\.?\s*(\d+)/gi, 'nomor $1'],
];

const EXIT_ORDINALS_ID = {
  1: 'pertama',
  2: 'kedua',
  3: 'ketiga',
  4: 'keempat',
  5: 'kelima',
  6: 'keenam',
};

export function normalizeJavaRoadName(rawRoad) {
  let text = String(rawRoad || '').trim();
  if (!text) return '';
  for (const [pattern, replacement] of ROAD_ABBREV_RULES) {
    text = text.replace(pattern, replacement);
  }
  // Clean slashes & redundant whitespace for smooth TTS cadence
  text = text.replace(/\s*\/\s*/g, ' atau ').replace(/\s+/g, ' ').trim();
  return text;
}

export function formatSpokenDistanceId(meters) {
  const m = Math.max(0, Math.round(Number(meters) || 0));
  if (m < 30) return 'sekarang';
  if (m < 100) {
    const rounded = Math.max(30, Math.round(m / 10) * 10);
    return `${rounded} meter`;
  }
  if (m < 950) {
    const rounded = Math.round(m / 50) * 50;
    return `${rounded} meter`;
  }
  const kmTenths = Math.round(m / 100);
  const whole = Math.floor(kmTenths / 10);
  const frac = kmTenths % 10;
  if (frac === 0) return `${whole} kilometer`;
  return `${whole} koma ${frac} kilometer`;
}

export function formatExitOrdinalId(exitNumber) {
  const n = Math.max(1, Math.min(6, Math.round(Number(exitNumber) || 1)));
  return EXIT_ORDINALS_ID[n] || `ke-${n}`;
}

/**
 * Classifies a raw Java OSM/TomTom road name + optional highway tag into
 * one of our Pulau Jawa road-context classes for Vector-Attention scoring.
 */
export function classifyJavaRoadContext({ roadName = '', highway = '', isTransitStop = false, mode = 'foot' } = {}) {
  const lowerName = String(roadName || '').toLowerCase();
  const hw = String(highway || '').toLowerCase();

  if (mode === 'train' || lowerName.includes('stasiun') || lowerName.startsWith('st.')) return 'stasiun';
  if (mode === 'bus' && (isTransitStop || lowerName.includes('halte') || lowerName.includes('busway'))) return 'halte';
  if (hw === 'motorway' || hw === 'motorway_link' || /\btol\b|\bjorr\b|\btrans\s*jawa\b|\bmbz\b/.test(lowerName)) {
    return 'tol';
  }
  if (lowerName.includes('flyover') || lowerName.includes('layang') || lowerName.includes('jembatan')) {
    return 'flyover';
  }
  if (lowerName.includes('underpass') || lowerName.includes('terowongan')) {
    return 'underpass';
  }
  if (lowerName.includes('bundaran') || lowerName.includes('simpang lima') || lowerName.includes('tugu')) {
    return 'bundaran';
  }
  if (hw === 'living_street' || hw === 'service' || /\bgang\b|^gg\.?\s/.test(lowerName)) {
    return 'gang';
  }
  if (['trunk', 'primary', 'secondary'].includes(hw) || /\bjend|\bsudirman|\bthamrin|\bgatot|\brasuna|\bsimatupang|\bring\s*road|\bsoekarno/.test(lowerName)) {
    return 'arteri';
  }
  return 'lokal';
}
