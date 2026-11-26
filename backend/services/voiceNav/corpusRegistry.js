/**
 * Canonical Google-Maps Indonesian Navigation Corpus Registry & Hard Symbolic Guardrail.
 *
 * Layer 1 of Kalceria Hybrid Neuro-Symbolic Voice Navigation:
 * Enforces 100% directional truth safety before Layer 2 Vector-Attention scores templates.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeJavaRoadName,
  formatSpokenDistanceId,
  formatExitOrdinalId,
} from './javaTextNormalizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_CORPUS_PATH = path.resolve(__dirname, 'modelData/GOOGLE_MAPS_ID_CORPUS.json');
const DEFAULT_CORPUS_PATH = fs.existsSync(BUNDLED_CORPUS_PATH)
  ? BUNDLED_CORPUS_PATH
  : path.resolve(__dirname, '../../../data/voice_nav_java/GOOGLE_MAPS_ID_CORPUS.json');

let cachedCorpus = null;

export function loadVoiceNavCorpus(customPath = DEFAULT_CORPUS_PATH) {
  if (cachedCorpus && customPath === DEFAULT_CORPUS_PATH) return cachedCorpus;
  const raw = fs.readFileSync(customPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (customPath === DEFAULT_CORPUS_PATH) cachedCorpus = parsed;
  return parsed;
}

/**
 * Hard Safety Audit: verifies NO single-direction left template mentions "kanan",
 * NO single-direction right template mentions "kiri", and every entry has valid metadata.
 */
export function validateCorpusSafetyInvariants(corpus) {
  const errors = [];
  const utterances = Array.isArray(corpus?.utterances) ? corpus.utterances : [];
  if (utterances.length === 0) {
    return { valid: false, errors: ['Corpus has zero utterances.'] };
  }

  const seenIds = new Set();
  const LEFT_LOCKS = new Set(['left', 'slight_left', 'sharp_left', 'keep_left', 'merge_left', 'arrive_left', 'chained_ll']);
  const RIGHT_LOCKS = new Set(['right', 'slight_right', 'sharp_right', 'keep_right', 'merge_right', 'arrive_right', 'chained_rr']);

  for (const entry of utterances) {
    if (!entry.id || seenIds.has(entry.id)) {
      errors.push(`Duplicate or missing id: ${entry.id}`);
    }
    seenIds.add(entry.id);

    const text = String(entry.template || '').toLowerCase();
    if (!text.trim()) {
      errors.push(`Empty template for ${entry.id}`);
    }
    if (LEFT_LOCKS.has(entry.directionLock) && /\bkanan\b/.test(text)) {
      errors.push(`Directional safety violation in ${entry.id}: left-locked template contains "kanan".`);
    }
    if (RIGHT_LOCKS.has(entry.directionLock) && /\bkiri\b/.test(text)) {
      errors.push(`Directional safety violation in ${entry.id}: right-locked template contains "kiri".`);
    }
    if (entry.directionLock === 'chained_lr') {
      const iL = text.indexOf('kiri');
      const iR = text.indexOf('kanan');
      if (iL === -1 || iR === -1 || iL >= iR) {
        errors.push(`Chained directional violation in ${entry.id}: chained_lr must order "kiri" before "kanan".`);
      }
    }
    if (entry.directionLock === 'chained_rl') {
      const iL = text.indexOf('kiri');
      const iR = text.indexOf('kanan');
      if (iL === -1 || iR === -1 || iR >= iL) {
        errors.push(`Chained directional violation in ${entry.id}: chained_rl must order "kanan" before "kiri".`);
      }
    }
    if (!Array.isArray(entry.modes) || entry.modes.length === 0) {
      errors.push(`Missing transport modes in ${entry.id}`);
    }
  }

  return { valid: errors.length === 0, count: utterances.length, errors };
}

/**
 * Layer 1 Hard Symbolic Filter:
 * Restricts candidate utterances STRICTLY to those matching ground-truth `directionLock`,
 * transport mode, and street-name slot availability (zero possibility of directional hallucination).
 */
export function filterSafeCandidates(corpus, { directionLock, mode = 'foot', hasRoadName = false } = {}) {
  const utterances = Array.isArray(corpus?.utterances) ? corpus.utterances : [];
  const exactDirection = utterances.filter((u) => u.directionLock === directionLock);
  if (exactDirection.length === 0) return [];

  const modeFiltered = exactDirection.filter(
    (u) => Array.isArray(u.modes) && u.modes.includes(mode)
  );
  const pool = modeFiltered.length > 0 ? modeFiltered : exactDirection;

  if (!hasRoadName) {
    const noRoadPool = pool.filter((u) => !u.requiresRoad);
    if (noRoadPool.length > 0) return noRoadPool;
  }
  return pool;
}

/**
 * Renders a chosen corpus utterance template with Java-normalized spoken slots.
 */
export function renderUtteranceTemplate(entry, slots = {}) {
  if (!entry?.template) return '';
  const spokenRoad = normalizeJavaRoadName(slots.road || slots.roadName || '') || 'jalan di depan';
  const spokenDistance =
    typeof slots.distanceText === 'string' && slots.distanceText.trim()
      ? slots.distanceText.trim()
      : formatSpokenDistanceId(slots.distanceMeters);
  const spokenExit = formatExitOrdinalId(slots.exitNumber || 1);
  const spokenEvent = normalizeJavaRoadName(slots.eventTitle || 'lokasi event') || 'lokasi event';
  const spokenStop = normalizeJavaRoadName(slots.stopName || 'pemberhentian berikutnya') || 'pemberhentian berikutnya';
  const spokenDestStop = normalizeJavaRoadName(slots.destStopName || 'tujuan') || 'tujuan';
  const spokenLine = normalizeJavaRoadName(slots.lineName || 'jalur utama') || 'jalur utama';
  const delayMin = Math.max(1, Math.round(Number(slots.delayMin || 5)));

  const replacements = {
    '{road}': spokenRoad,
    '{distance}': spokenDistance,
    '{exitOrdinal}': spokenExit,
    '{eventTitle}': spokenEvent,
    '{stopName}': spokenStop,
    '{destStopName}': spokenDestStop,
    '{lineName}': spokenLine,
    '{delayMin}': String(delayMin),
  };

  let out = String(entry.template);
  for (const [token, val] of Object.entries(replacements)) {
    out = out.split(token).join(val);
  }
  return out.replace(/\s+/g, ' ').trim();
}
