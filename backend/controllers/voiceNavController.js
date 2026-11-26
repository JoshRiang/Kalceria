/**
 * Voice Navigation Runtime Controller (Iteration 3/5).
 *
 * Exposes:
 * - GET  /api/map/voice-nav/bundle   : Serves compact 26 KB trained Pulau Jawa Vector-Attention weights + 66-utterance corpus
 * - POST /api/map/voice-nav/evaluate : Evaluates either a direct context vector OR a live GPS tick via the trigger state machine
 */

import {
  getDefaultJavaAttentionEngine,
  loadVoiceNavRuntimeBundle,
} from '../services/voiceNav/attentionInferenceEngine.js';
import {
  createVoiceNavTriggerState,
  evaluateNavigationTick,
} from '../services/voiceNav/maneuverTriggerStateMachine.js';

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

