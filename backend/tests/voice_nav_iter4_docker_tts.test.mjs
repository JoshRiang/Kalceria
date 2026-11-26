import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeSpeechRequest,
  isValidWavBuffer,
  clearTtsAudioCache,
  synthesizeVoiceNavSpeech,
  probeVoiceNavTtsHealth,
} from '../services/voiceNav/ttsSynthesisService.js';

function createDummyValidWavBuffer(payloadBytes = 128) {
  const buf = Buffer.alloc(44 + payloadBytes);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + payloadBytes, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.write('data', 36, 'ascii');
  return buf;
}

test('Iteration 4/5: Docker Piper MIT TTS stack & unified Java nav compose enforce MIT license and pre-bake 18 core phrases', () => {
  const dockerfile = fs.readFileSync(path.resolve('infra/voice-tts-id/Dockerfile'), 'utf8');
  const serverPy = fs.readFileSync(path.resolve('infra/voice-tts-id/server.py'), 'utf8');
  const prebakePy = fs.readFileSync(path.resolve('infra/voice-tts-id/prebake_phrases.py'), 'utf8');
  const composeUnified = fs.readFileSync(path.resolve('infra/docker-compose.java-nav.yml'), 'utf8');
  const staticPhrases = JSON.parse(
    fs.readFileSync(path.resolve('infra/voice-tts-id/static_phrases_id.json'), 'utf8')
  );
  const iter4Md = fs.readFileSync(path.resolve('docs/ITERATION_4_DOCKER_NEURAL_TTS.md'), 'utf8');

  // Verify exact official MIT HuggingFace URL and ZERO non-commercial Meta MMS-TTS model
  assert.match(
    dockerfile,
    /https:\/\/huggingface\.co\/rhasspy\/piper-voices\/resolve\/main\/id\/id_ID\/news_tts\/medium\/id_ID-news_tts-medium\.onnx/
  );
  assert.doesNotMatch(dockerfile, /mms-tts-ind|CC-BY-NC/i);
  assert.match(dockerfile, /prebake_phrases\.py/);
  assert.match(serverPy, /"license":\s*"MIT"/);
  assert.match(prebakePy, /SynthesisConfig/);
  assert.match(composeUnified, /osrm-java-motorcycle/);
  assert.match(composeUnified, /voice-tts-id/);
  assert.ok(Array.isArray(staticPhrases) && staticPhrases.length >= 16);
  assert.match(iter4Md, /Handoff ke Iterasi 5\/5/);
});

test('Iteration 4/5: ttsSynthesisService sanitizes Java text, validates RIFF/WAVE, caches neural audio in LRU, and gracefully degrades on fallback', async () => {
  clearTtsAudioCache();

  // 1. Sanitization + Java pronunciation normalization + prosody rate clamp
  const clean = sanitizeSpeechRequest({
    text: '  Dalam 200 meter, belok kiri ke Jl. Jend. Sudirman \n\t ',
    prosodyRate: 2.5,
    urgency: 'urgent',
  });
  assert.equal(clean.spokenText, 'Dalam 200 meter, belok kiri ke Jalan Jenderal Sudirman');
  assert.equal(clean.prosodyRate, 1.2);
  assert.equal(clean.urgency, 'urgent');

  const emptyErr = await synthesizeVoiceNavSpeech({ text: '   ' });
  assert.equal(emptyErr.status, 400);

  // 2. Zero-crash graceful fallback when VOICE_TTS_URL is unconfigured
  const fallback = await synthesizeVoiceNavSpeech(
    { text: 'Belok kiri sekarang.', prosodyRate: 1.08, urgency: 'urgent' },
    { ttsBaseUrl: '' }
  );
  assert.equal(fallback.ok, true);
  assert.equal(fallback.mode, 'browser_speech_fallback');
  assert.equal(fallback.lang, 'id-ID');
  assert.equal(fallback.reason, 'tts_upstream_unconfigured');

  // 3. Mock MIT Piper upstream returning valid RIFF/WAVE + verify 2nd call hits Backend LRU cache (1 upstream call total!)
  let fetchCount = 0;
  const mockWav = createDummyValidWavBuffer(256);
  assert.equal(isValidWavBuffer(mockWav), true);
  assert.equal(isValidWavBuffer(Buffer.from('NOT_A_WAV_FILE_PAYLOAD')), false);

  const mockFetch = async (url, opts) => {
    fetchCount += 1;
    assert.equal(url, 'http://tts.local:5055/synthesize');
    assert.equal(opts.headers['X-TTS-Token'], 'secret-123');
    return {
      ok: true,
      status: 200,
      headers: { get: (k) => (k.toLowerCase() === 'x-tts-cache' ? 'prebaked' : null) },
      arrayBuffer: async () => mockWav,
    };
  };

  const first = await synthesizeVoiceNavSpeech(
    { text: 'Belok kiri sekarang.', prosodyRate: 1.08 },
    { ttsBaseUrl: 'http://tts.local:5055', ttsApiSecret: 'secret-123', fetchImpl: mockFetch, nowMs: 1000 }
  );
  assert.equal(first.mode, 'neural_wav');
  assert.equal(first.cacheStatus, 'prebaked');
  assert.equal(first.audioBuffer.length, mockWav.length);
  assert.equal(fetchCount, 1);

  const second = await synthesizeVoiceNavSpeech(
    { text: 'Belok kiri sekarang.', prosodyRate: 1.08 },
    { ttsBaseUrl: 'http://tts.local:5055', ttsApiSecret: 'secret-123', fetchImpl: mockFetch, nowMs: 2000 }
  );
  assert.equal(second.mode, 'neural_wav');
  assert.equal(second.cacheStatus, 'backend-lru');
  assert.equal(fetchCount, 1); // Served straight from backend RAM cache!

  // 4. Corrupt non-WAV upstream response degrades safely without crashing
  const corruptRes = await synthesizeVoiceNavSpeech(
    { text: 'Putar balik sekarang jika aman.' },
    {
      ttsBaseUrl: 'http://tts.local:5055',
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        arrayBuffer: async () => Buffer.from('<html>502 Bad Gateway</html>'),
      }),
    }
  );
  assert.equal(corruptRes.mode, 'browser_speech_fallback');
  assert.equal(corruptRes.reason, 'tts_invalid_wav_payload');

  // 5. Health probe unconfigured & healthy mock
  const healthOff = await probeVoiceNavTtsHealth({ ttsBaseUrl: '' });
  assert.equal(healthOff.neuralConfigured, false);
  assert.equal(healthOff.license, 'MIT');

  const healthOn = await probeVoiceNavTtsHealth({
    ttsBaseUrl: 'http://tts.local:5055',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ model: 'id_ID-news_tts-medium', license: 'MIT', prebakedCount: 18 }),
    }),
  });
  assert.equal(healthOn.neuralHealthy, true);
  assert.equal(healthOn.activeMode, 'neural_wav');
  assert.equal(healthOn.prebakedCount, 18);
});

test('Iteration 4/5: backend routes register /map/voice-nav/speak and /map/voice-nav/tts-health', () => {
  const routesSrc = fs.readFileSync(path.resolve('backend/routes/index.js'), 'utf8');
  assert.match(routesSrc, /\/map\/voice-nav\/speak/);
  assert.match(routesSrc, /\/map\/voice-nav\/tts-health/);
});

