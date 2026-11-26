/**
 * Voice Navigation Runtime Controller (Iterations 3/5 & 4/5).
 *
 * Exposes:
 * - GET  /api/map/voice-nav/bundle     : Serves compact 26 KB trained Pulau Jawa Vector-Attention weights + 66-utterance corpus
 * - POST /api/map/voice-nav/evaluate   : Evaluates either a direct context vector OR a live GPS tick via the trigger state machine
 * - POST /api/map/voice-nav/speak      : Synthesizes Indonesian speech via MIT Piper Docker (`audio/wav`) or returns safe browser fallback
 * - GET  /api/map/voice-nav/tts-health : Reports Neural TTS container availability and active speech mode
 */

import {
  getDefaultJavaAttentionEngine,
  loadVoiceNavRuntimeBundle,
} from '../services/voiceNav/attentionInferenceEngine.js';
import {
  createVoiceNavTriggerState,
  evaluateNavigationTick,
} from '../services/voiceNav/maneuverTriggerStateMachine.js';
import {
  synthesizeVoiceNavSpeech,
  probeVoiceNavTtsHealth,
} from '../services/voiceNav/ttsSynthesisService.js';

export function getVoiceNavBundleHandler(req, res, next) {
  try {
    const bundle = loadVoiceNavRuntimeBundle();
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.json({
      ok: true,
      version: bundle.version,
      regionScope: bundle.regionScope,
      corpus: bundle.corpus,
      weights: bundle.weights,
    });
  } catch (err) {
    return next(err);
  }
}

export function evaluateVoiceNavHandler(req, res, next) {
  try {
    const engine = getDefaultJavaAttentionEngine();
    const body = req.body || {};

    // Mode A: Full GPS tick evaluation through real-time maneuver trigger state machine
    if (body.route && body.gps) {
      const state = body.state ? createVoiceNavTriggerState(body.state) : createVoiceNavTriggerState();
      const result = evaluateNavigationTick({
        state,
        route: body.route,
        gps: body.gps,
        destination: body.destination || null,
        eventTitle: body.eventTitle || 'lokasi event',
        nowMs: Number(body.nowMs) || Date.now(),
        engine,
      });
      return res.json({ ok: true, ...result });
    }

    // Mode B: Direct single-shot Vector-Attention context inference
    if (body.context && typeof body.context === 'object') {
      const decision = engine.infer(body.context, body.slots || {});
      return res.json({ ok: true, decision, metadata: engine.getMetadata() });
    }

    return res.status(400).json({
      error: 'Provide either { route, gps } for tick evaluation or { context, slots } for direct inference.',
    });
  } catch (err) {
    return next(err);
  }
}

export async function speakVoiceNavHandler(req, res, next) {
  try {
    const body = req.body || {};
    let text = body.text;
    let prosodyRate = body.prosodyRate;
    let urgency = body.urgency;
    let decision = null;

    // Optional one-shot mode: pass Vector-Attention { context, slots } directly to synthesize!
    if (!text && body.context && typeof body.context === 'object') {
      const engine = getDefaultJavaAttentionEngine();
      decision = engine.infer(body.context, body.slots || {});
      text = decision.spokenText;
      prosodyRate = prosodyRate ?? decision.prosodyRate;
      urgency = urgency ?? decision.urgency;
    }

    const result = await synthesizeVoiceNavSpeech({ text, prosodyRate, urgency });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    if (result.mode === 'neural_wav' && result.audioBuffer) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Kalceria-Voice-Mode', 'neural-piper-mit');
      res.setHeader('X-Kalceria-TTS-Cache', String(result.cacheStatus || 'synthesized'));
      res.setHeader('X-Kalceria-Spoken-Text', encodeURIComponent(result.spokenText));
      return res.status(200).send(result.audioBuffer);
    }

    return res.json({
      ...result,
      ...(decision ? { decision } : {}),
    });
  } catch (err) {
    return next(err);
  }
}

export async function getVoiceNavTtsHealthHandler(req, res, next) {
  try {
    const health = await probeVoiceNavTtsHealth();
    return res.json(health);
  } catch (err) {
    return next(err);
  }
}

