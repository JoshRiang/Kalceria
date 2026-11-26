/**
 * Backend Neural Voice TTS Proxy & Resilient Fallback Service (Iteration 4/5).
 *
 * Bridges Kalceria Backend (`/api/map/voice-nav/speak`) with our self-hosted
 * Copyright-Free MIT Piper ONNX Docker container (`VOICE_TTS_URL`), featuring:
 * 1. Java street pronunciation normalization & input length/rate guards
 * 2. Bounded in-memory LRU WAV cache (shared across convoy members in Group Blend)
 * 3. RIFF/WAVE integrity validation + strict AbortController timeout (3.2s)
 * 4. Zero-crash graceful degradation to `browser_speech_fallback` (`id-ID`)
 */

import { normalizeJavaRoadName } from './javaTextNormalizer.js';

const TTS_LRU_CACHE = new Map();
const TTS_CACHE_MAX = 120;
const TTS_CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 3200;
const MAX_WAV_BYTES = 2 * 1024 * 1024;

export function sanitizeSpeechRequest({ text = '', prosodyRate = 1.0, urgency = 'advisory' } = {}) {
  const stripped = String(text || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);

  const spokenText = normalizeJavaRoadName(stripped);
  const rawRate = Number(prosodyRate);
  const safeRate = Number.isFinite(rawRate)
    ? Number(Math.max(0.85, Math.min(1.2, rawRate)).toFixed(2))
    : 1.0;

  const safeUrgency = ['calm', 'advisory', 'urgent', 'alert'].includes(String(urgency))
    ? String(urgency)
    : 'advisory';

  return {
    spokenText,
    prosodyRate: safeRate,
    urgency: safeUrgency,
  };
}

export function isValidWavBuffer(buf) {
  if (!buf || buf.length <= 44 || buf.length > MAX_WAV_BYTES) return false;
  return (
    buf[0] === 0x52 && // 'R'
    buf[1] === 0x49 && // 'I'
    buf[2] === 0x46 && // 'F'
    buf[3] === 0x46 && // 'F'
    buf[8] === 0x57 && // 'W'
    buf[9] === 0x41 && // 'A'
    buf[10] === 0x56 && // 'V'
    buf[11] === 0x45 // 'E'
  );
}

export function clearTtsAudioCache() {
  TTS_LRU_CACHE.clear();
}

function makeCacheKey(spokenText, prosodyRate) {
  return `${prosodyRate.toFixed(2)}|${spokenText}`;
}

export async function synthesizeVoiceNavSpeech(
  { text, prosodyRate = 1.0, urgency = 'advisory' } = {},
  {
    ttsBaseUrl = process.env.VOICE_TTS_URL || '',
    ttsApiSecret = process.env.VOICE_TTS_API_SECRET || '',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    nowMs = Date.now(),
  } = {}
) {
  const clean = sanitizeSpeechRequest({ text, prosodyRate, urgency });
  if (!clean.spokenText) {
    return { error: 'Speech text is required.', status: 400 };
  }

  const baseUrl = String(ttsBaseUrl || '').trim().replace(/\/+$/, '');
  if (!baseUrl) {
    return {
      ok: true,
      mode: 'browser_speech_fallback',
      engine: 'web-speech-id-ID',
      license: 'browser-native',
      lang: 'id-ID',
      spokenText: clean.spokenText,
      prosodyRate: clean.prosodyRate,
      urgency: clean.urgency,
      reason: 'tts_upstream_unconfigured',
    };
  }

  const cacheKey = makeCacheKey(clean.spokenText, clean.prosodyRate);
  const cached = TTS_LRU_CACHE.get(cacheKey);
  if (cached && cached.expAt > nowMs) {
    // Refresh LRU recency
    TTS_LRU_CACHE.delete(cacheKey);
    TTS_LRU_CACHE.set(cacheKey, cached);
    return {
      ok: true,
      mode: 'neural_wav',
      engine: 'piper-id-news-tts-medium-mit',
      license: 'MIT',
      contentType: 'audio/wav',
      audioBuffer: cached.audioBuffer,
      cacheStatus: 'backend-lru',
      latencyMs: 0,
      spokenText: clean.spokenText,
      prosodyRate: clean.prosodyRate,
      urgency: clean.urgency,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();

  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'audio/wav',
    };
    if (ttsApiSecret) {
      headers['X-TTS-Token'] = String(ttsApiSecret);
    }

    const upstream = await fetchImpl(`${baseUrl}/synthesize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: clean.spokenText,
        prosodyRate: clean.prosodyRate,
        urgency: clean.urgency,
      }),
      signal: controller.signal,
    });

    if (!upstream || !upstream.ok) {
      return {
        ok: true,
        mode: 'browser_speech_fallback',
        engine: 'web-speech-id-ID',
        lang: 'id-ID',
        spokenText: clean.spokenText,
        prosodyRate: clean.prosodyRate,
        urgency: clean.urgency,
        reason: `tts_upstream_http_${upstream?.status || 502}`,
      };
    }

    const rawBuf = Buffer.from(await upstream.arrayBuffer());
    if (!isValidWavBuffer(rawBuf)) {
      return {
        ok: true,
        mode: 'browser_speech_fallback',
        engine: 'web-speech-id-ID',
        lang: 'id-ID',
        spokenText: clean.spokenText,
        prosodyRate: clean.prosodyRate,
        urgency: clean.urgency,
        reason: 'tts_invalid_wav_payload',
      };
    }

    TTS_LRU_CACHE.set(cacheKey, {
      audioBuffer: rawBuf,
      expAt: nowMs + TTS_CACHE_TTL_MS,
    });
    if (TTS_LRU_CACHE.size > TTS_CACHE_MAX) {
      const oldestKey = TTS_LRU_CACHE.keys().next().value;
      if (oldestKey !== undefined) TTS_LRU_CACHE.delete(oldestKey);
    }

    return {
      ok: true,
      mode: 'neural_wav',
      engine: 'piper-id-news-tts-medium-mit',
      license: 'MIT',
      contentType: 'audio/wav',
      audioBuffer: rawBuf,
      cacheStatus: upstream.headers?.get?.('x-tts-cache') || 'synthesized',
      latencyMs: Date.now() - t0,
      spokenText: clean.spokenText,
      prosodyRate: clean.prosodyRate,
      urgency: clean.urgency,
    };
  } catch (err) {
    return {
      ok: true,
      mode: 'browser_speech_fallback',
      engine: 'web-speech-id-ID',
      lang: 'id-ID',
      spokenText: clean.spokenText,
      prosodyRate: clean.prosodyRate,
      urgency: clean.urgency,
      reason: err?.name === 'AbortError' ? 'tts_upstream_timeout' : 'tts_upstream_unreachable',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeVoiceNavTtsHealth({
  ttsBaseUrl = process.env.VOICE_TTS_URL || '',
  fetchImpl = globalThis.fetch,
  timeoutMs = 2500,
} = {}) {
  const baseUrl = String(ttsBaseUrl || '').trim().replace(/\/+$/, '');
  if (!baseUrl) {
    return {
      ok: true,
      neuralConfigured: false,
      activeMode: 'browser_speech_fallback',
      model: 'id_ID-news_tts-medium',
      license: 'MIT',
      cacheEntries: TTS_LRU_CACHE.size,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${baseUrl}/health`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res?.ok) {
      return {
        ok: true,
        neuralConfigured: true,
        neuralHealthy: false,
        activeMode: 'browser_speech_fallback',
        model: 'id_ID-news_tts-medium',
        license: 'MIT',
        cacheEntries: TTS_LRU_CACHE.size,
      };
    }
    const detail = await res.json().catch(() => ({}));
    return {
      ok: true,
      neuralConfigured: true,
      neuralHealthy: true,
      activeMode: 'neural_wav',
      model: detail.model || 'id_ID-news_tts-medium',
      license: detail.license || 'MIT',
      prebakedCount: detail.prebakedCount ?? 0,
      cacheEntries: TTS_LRU_CACHE.size,
    };
  } catch {
    return {
      ok: true,
      neuralConfigured: true,
      neuralHealthy: false,
      activeMode: 'browser_speech_fallback',
      model: 'id_ID-news_tts-medium',
      license: 'MIT',
      cacheEntries: TTS_LRU_CACHE.size,
    };
  } finally {
    clearTimeout(timer);
  }
}

