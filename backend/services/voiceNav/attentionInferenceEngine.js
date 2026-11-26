/**
 * Node.js Runtime Loader for Kalceria Pulau Jawa Vector-Attention Engine.
 *
 * Resolves model JSONs from `modelData/` (bundled into Vercel Lambda via `vercel.json`)
 * with transparent fallback to repo-root `data/voice_nav_java/` for local dev & tests.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJavaAttentionEngine } from './attentionCore.js';

export * from './attentionCore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_DIR = path.resolve(__dirname, 'modelData');
const ROOT_DATA_DIR = path.resolve(__dirname, '../../../data/voice_nav_java');

function resolveDataFile(filename) {
  const bundled = path.join(BUNDLED_DIR, filename);
  if (fs.existsSync(bundled)) return bundled;
  return path.join(ROOT_DATA_DIR, filename);
}

let cachedBundle = null;
let cachedEngine = null;

export function loadVoiceNavRuntimeBundle() {
  if (cachedBundle) return cachedBundle;
  const corpus = JSON.parse(fs.readFileSync(resolveDataFile('GOOGLE_MAPS_ID_CORPUS.json'), 'utf8'));
  const weights = JSON.parse(fs.readFileSync(resolveDataFile('JAVA_ATTENTION_WEIGHTS_V1.json'), 'utf8'));
  cachedBundle = {
    version: weights.version || '1.0.0',
    regionScope: weights.regionScope || 'Pulau Jawa (Indonesia)',
    corpus,
    weights,
  };
  return cachedBundle;
}

export function getDefaultJavaAttentionEngine() {
  if (cachedEngine) return cachedEngine;
  const { weights, corpus } = loadVoiceNavRuntimeBundle();
  cachedEngine = createJavaAttentionEngine({ weights, corpus });
  return cachedEngine;
}

