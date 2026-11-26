/**
 * Client-Side Pure Multi-Head Vector-Attention Engine & Pulau Jawa Text Normalizer.
 *
 * Self-contained inside `frontend/` (ZERO `@/`, ZERO React, ZERO DOM, ZERO `node:*`)
 * so Next.js / Vercel Frontend builds cleanly and Gate 3b (`node --test`) verifies directly.
 * Bit-for-bit parity with `backend/services/voiceNav/attentionCore.js` and Python trainer.
 */

const ROAD_ABBREV_RULES = [
  [/\bJln\.?\s+/gi, "Jalan "],
  [/\bJl\.?\s+/gi, "Jalan "],
  [/\bGg\.?\s+/gi, "Gang "],
  [/\bLetjend?\.?\s+/gi, "Letnan Jenderal "],
  [/\bMayjend?\.?\s+/gi, "Mayor Jenderal "],
  [/\bBrigjend?\.?\s+/gi, "Brigadir Jenderal "],
  [/\bJend\.?\s+/gi, "Jenderal "],
  [/\bKol\.?\s+/gi, "Kolonel "],
  [/\bKapt\.?\s+/gi, "Kapten "],
  [/\bProf\.?\s+/gi, "Profesor "],
  [/\bDrs\.?\s+/gi, "Doktorandus "],
  [/\bDr\.?\s+/gi, "Dokter "],
  [/\bIr\.?\s+/gi, "Insinyur "],
  [/\bKH\.?\s+/gi, "Kiai Haji "],
  [/\bH\.?\s+/gi, "Haji "],
  [/\bHj\.?\s+/gi, "Hajah "],
  [/\bSt\.?\s+/gi, "Stasiun "],
  [/\bHlt\.?\s+/gi, "Halte "],
  [/\bSimp\.?\s+/gi, "Simpang "],
  [/\bBund\.?\s+/gi, "Bundaran "],
  [/\bRSUD\b/g, "Rumah Sakit Umum Daerah"],
  [/\bSPBU\b/g, "Es Pe Be U"],
  [/\bJORR\b/gi, "Jor"],
  [/\bMBZ\b/gi, "Em Be Zet"],
  [/\bBundaran HI\b/gi, "Bundaran Ha I"],
  [/\bKRL\b/g, "Ka Er El"],
  [/\bMRT\b/g, "Em Er Te"],
  [/\bLRT\b/g, "El Er Te"],
  [/\bTB\s+Simatupang\b/gi, "Te Be Simatupang"],
  [/\bMT\s+Haryono\b/gi, "Em Te Haryono"],
  [/\bHR\s+Rasuna\b/gi, "Ha Er Rasuna"],
  [/\bKm\.?\s*(\d+)/gi, "kilometer $1"],
  [/\bNo\.?\s*(\d+)/gi, "nomor $1"],
];

const EXIT_ORDINALS_ID = {
  1: "pertama",
  2: "kedua",
  3: "ketiga",
  4: "keempat",
  5: "kelima",
  6: "keenam",
};

export const MODES = Object.freeze(["foot", "motorcycle", "car", "bus", "train"]);
export const DISTANCE_BUCKETS = Object.freeze([
  "far_1000m",
  "prepare_500m",
  "approach_200m",
  "imminent_80m",
  "now_25m",
  "immediate",
]);
export const ROAD_CLASSES = Object.freeze([
  "tol",
  "arteri",
  "lokal",
  "gang",
  "bundaran",
  "flyover",
  "underpass",
  "perlintasan_ka",
  "stasiun",
  "halte",
]);
export const TRAFFIC_STATES = Object.freeze(["FREE", "MODERATE", "SLOW", "JAM"]);
export const FEATURE_DIM = 30;

const MODE_IDX = Object.fromEntries(MODES.map((k, i) => [k, i]));
const DIST_IDX = Object.fromEntries(DISTANCE_BUCKETS.map((k, i) => [k, i]));
const ROAD_IDX = Object.fromEntries(ROAD_CLASSES.map((k, i) => [k, i]));
const TRAF_IDX = Object.fromEntries(TRAFFIC_STATES.map((k, i) => [k, i]));

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function normalizeJavaRoadName(rawRoad) {
  let text = String(rawRoad || "").trim();
  if (!text) return "";
  for (const [pattern, replacement] of ROAD_ABBREV_RULES) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/\s*\/\s*/g, " atau ").replace(/\s+/g, " ").trim();
}

export function formatSpokenDistanceId(meters) {
  const m = Math.max(0, Math.round(Number(meters) || 0));
  if (m < 30) return "sekarang";
  if (m < 100) return `${Math.max(30, Math.round(m / 10) * 10)} meter`;
  if (m < 950) return `${Math.round(m / 50) * 50} meter`;
  const kmTenths = Math.round(m / 100);
  const whole = Math.floor(kmTenths / 10);
  const frac = kmTenths % 10;
  return frac === 0 ? `${whole} kilometer` : `${whole} koma ${frac} kilometer`;
}

export function formatExitOrdinalId(exitNumber) {
  const n = Math.max(1, Math.min(6, Math.round(Number(exitNumber) || 1)));
  return EXIT_ORDINALS_ID[n] || `ke-${n}`;
}

export function bucketizeDistanceMeters(distanceMeters, { mode = "foot", speedKmh = 0 } = {}) {
  const d = Math.max(0, Number(distanceMeters) || 0);
  const v = Math.max(0, Number(speedKmh) || 0);
  if (d <= 12) return "immediate";
  if (mode === "foot") {
    if (d <= 30) return "now_25m";
    if (d <= 85) return "imminent_80m";
    if (d <= 220) return "approach_200m";
    if (d <= 520) return "prepare_500m";
    return "far_1000m";
  }
  const extraKmh = Math.max(0, v - 25);
  if (d <= clamp(32 + extraKmh * 0.45, 32, 62)) return "now_25m";
  if (d <= clamp(95 + extraKmh * 1.15, 95, 175)) return "imminent_80m";
  if (d <= clamp(250 + extraKmh * 2.4, 250, 420)) return "approach_200m";
  if (d <= clamp(580 + extraKmh * 5.0, 580, 950)) return "prepare_500m";
  return "far_1000m";
}

export function encodeContextVector30({
  mode = "foot",
  distanceBucket = "approach_200m",
  roadClass = "lokal",
  trafficState = "FREE",
  hasRoadName = false,
  hasChainedNext = false,
  speedKmh = 0,
  isEndOfRoad = false,
  isNewRoadName = false,
} = {}) {
  const vec = new Float64Array(FEATURE_DIM);
  const mIdx = MODE_IDX[String(mode).toLowerCase()];
  if (mIdx !== undefined) vec[mIdx] = 1.0;
  const dIdx = DIST_IDX[distanceBucket];
  if (dIdx !== undefined) vec[5 + dIdx] = 1.0;
  const rIdx = ROAD_IDX[String(roadClass).toLowerCase()];
  if (rIdx !== undefined) vec[11 + rIdx] = 1.0;
  const tIdx = TRAF_IDX[String(trafficState).toUpperCase()];
  if (tIdx !== undefined) vec[21 + tIdx] = 1.0;
  vec[25] = hasRoadName ? 1.0 : 0.0;
  vec[26] = hasChainedNext ? 1.0 : 0.0;
  vec[27] = clamp((Number(speedKmh) || 0) / 90.0, 0.0, 1.0);
  vec[28] = isEndOfRoad ? 1.0 : 0.0;
  vec[29] = isNewRoadName ? 1.0 : 0.0;
  return vec;
}

export function renderSpokenUtterance(entry, slots = {}) {
  if (!entry?.template) return "";
  const replacements = {
    "{road}": normalizeJavaRoadName(slots.road || slots.roadName || "") || "jalan di depan",
    "{distance}":
      typeof slots.distanceText === "string" && slots.distanceText.trim()
        ? slots.distanceText.trim()
        : formatSpokenDistanceId(slots.distanceMeters),
    "{exitOrdinal}": formatExitOrdinalId(slots.exitNumber || 1),
    "{eventTitle}": normalizeJavaRoadName(slots.eventTitle || "lokasi event") || "lokasi event",
    "{stopName}": normalizeJavaRoadName(slots.stopName || "pemberhentian berikutnya") || "pemberhentian berikutnya",
    "{destStopName}": normalizeJavaRoadName(slots.destStopName || "tujuan") || "tujuan",
    "{lineName}": normalizeJavaRoadName(slots.lineName || "jalur utama") || "jalur utama",
    "{delayMin}": String(Math.max(1, Math.round(Number(slots.delayMin || 5)))),
  };
  let out = String(entry.template);
  for (const [token, val] of Object.entries(replacements)) {
    out = out.split(token).join(val);
  }
  return out.replace(/\s+/g, " ").trim();
}

export function createClientAttentionEngine({ weights, corpus }) {
  if (!weights || !corpus || !Array.isArray(corpus.utterances)) {
    throw new Error("createClientAttentionEngine requires valid { weights, corpus }.");
  }
  const utterances = corpus.utterances;
  const N = utterances.length;
  const numHeads = Number(weights.architecture?.numHeads || weights.W_Q?.length || 4);
  const featureDim = Number(weights.architecture?.featureDim || FEATURE_DIM);
  const headDim = Number(weights.architecture?.headDim || weights.W_Q?.[0]?.[0]?.length || 8);
  const scale = 1.0 / Math.sqrt(headDim);

  const projectedKeys = new Array(numHeads);
  const flatWQ = new Array(numHeads);
  const E = weights.corpusEmbeddings;

  for (let h = 0; h < numHeads; h++) {
    const wqH = weights.W_Q[h];
    const wkH = weights.W_K[h];
    const flatQ = new Float64Array(featureDim * headDim);
    for (let f = 0; f < featureDim; f++) {
      for (let d = 0; d < headDim; d++) {
        flatQ[f * headDim + d] = Number(wqH[f][d]) || 0;
      }
    }
    flatWQ[h] = flatQ;

    const kFlat = new Float64Array(N * headDim);
    for (let i = 0; i < N; i++) {
      const eRow = E[i];
      for (let d = 0; d < headDim; d++) {
        let sum = 0;
        for (let f = 0; f < featureDim; f++) {
          sum += (Number(eRow[f]) || 0) * (Number(wkH[f][d]) || 0);
        }
        kFlat[i * headDim + d] = sum;
      }
    }
    projectedKeys[h] = kFlat;
  }

  const headScale = Float64Array.from(weights.headScale.map((v) => Number(v) || 0));
  const bias = Float64Array.from(weights.bias.map((v) => Number(v) || 0));
  const indicesByLock = new Map();
  for (let i = 0; i < N; i++) {
    const lock = utterances[i].directionLock;
    if (!indicesByLock.has(lock)) indicesByLock.set(lock, []);
    indicesByLock.get(lock).push(i);
  }

  function infer(context = {}, slots = {}) {
    const mode = String(context.mode || "foot").toLowerCase();
    const speedKmh = Math.max(0, Number(context.speedKmh) || 0);
    const distanceBucket =
      context.distanceBucket ||
      bucketizeDistanceMeters(context.distanceMeters ?? slots.distanceMeters ?? 150, { mode, speedKmh });
    const hasRoadName = Boolean(
      context.hasRoadName !== undefined
        ? context.hasRoadName
        : String(slots.road || slots.roadName || "").trim().length > 0
    );

    const useChained = Boolean(
      context.hasChainedNext &&
        context.chainedDirectionLock &&
        indicesByLock.has(context.chainedDirectionLock) &&
        (distanceBucket === "approach_200m" || distanceBucket === "imminent_80m")
    );
    const requestedLock = useChained ? context.chainedDirectionLock : String(context.directionLock || "straight");
    const effectiveLock = indicesByLock.has(requestedLock) ? requestedLock : "straight";
    const rawCandidates = indicesByLock.get(effectiveLock) || [0];

    let safeCandidates = rawCandidates;
    if (!hasRoadName) {
      const noRoadOnly = rawCandidates.filter((idx) => !utterances[idx].requiresRoad);
      if (noRoadOnly.length > 0) safeCandidates = noRoadOnly;
    }

    const x = encodeContextVector30({
      mode,
      distanceBucket,
      roadClass: context.roadClass || "lokal",
      trafficState: context.trafficState || "FREE",
      hasRoadName,
      hasChainedNext: useChained,
      speedKmh,
      isEndOfRoad: Boolean(context.isEndOfRoad),
      isNewRoadName: Boolean(context.isNewRoadName),
    });

    const scores = new Float64Array(safeCandidates.length);
    const qBuf = new Float64Array(headDim);
    for (let c = 0; c < safeCandidates.length; c++) scores[c] = bias[safeCandidates[c]];

    for (let h = 0; h < numHeads; h++) {
      const wq = flatWQ[h];
      for (let d = 0; d < headDim; d++) {
        let s = 0;
        for (let f = 0; f < featureDim; f++) {
          if (x[f] !== 0) s += x[f] * wq[f * headDim + d];
        }
        qBuf[d] = s;
      }
      const kFlat = projectedKeys[h];
      const hsScale = headScale[h] * scale;
      for (let c = 0; c < safeCandidates.length; c++) {
        const baseOffset = safeCandidates[c] * headDim;
        let dot = 0;
        for (let d = 0; d < headDim; d++) dot += qBuf[d] * kFlat[baseOffset + d];
        scores[c] += hsScale * dot;
      }
    }

    let maxLogit = -Infinity;
    for (let c = 0; c < safeCandidates.length; c++) if (scores[c] > maxLogit) maxLogit = scores[c];
    let sumExp = 0;
    const exps = new Float64Array(safeCandidates.length);
    let bestC = 0;
    for (let c = 0; c < safeCandidates.length; c++) {
      exps[c] = Math.exp(clamp(scores[c] - maxLogit, -40, 0));
      sumExp += exps[c];
      if (scores[c] > scores[bestC]) bestC = c;
    }

    const winner = utterances[safeCandidates[bestC]];
    return {
      utteranceId: winner.id,
      category: winner.category,
      directionLock: winner.directionLock,
      distanceBucket,
      confidence: Number((exps[bestC] / Math.max(sumExp, 1e-12)).toFixed(4)),
      urgency: winner.urgency,
      prosodyRate: winner.prosodyRate,
      spokenText: renderSpokenUtterance(winner, {
        ...slots,
        distanceMeters: slots.distanceMeters ?? context.distanceMeters,
      }),
      directionSafe: winner.directionLock === effectiveLock,
    };
  }

  return { infer };
}

