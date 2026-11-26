import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeJavaRoadName,
  formatSpokenDistanceId,
  formatExitOrdinalId,
  classifyJavaRoadContext,
} from '../services/voiceNav/javaTextNormalizer.js';
import {
  loadVoiceNavCorpus,
  validateCorpusSafetyInvariants,
  filterSafeCandidates,
  renderUtteranceTemplate,
} from '../services/voiceNav/corpusRegistry.js';

test('Iteration 1/5: ALL-CAPS Master Plan & Iteration 1 docs exist and document 5 waves + MIT Piper TTS', () => {
  const masterMd = fs.readFileSync(path.resolve('docs/AI_VOICE_NAVIGATION_MASTER_PLAN.md'), 'utf8');
  const iter1Md = fs.readFileSync(path.resolve('docs/ITERATION_1_VOICE_NAV_CORPUS_AND_METHODOLOGY.md'), 'utf8');

  assert.match(masterMd, /id_ID-news_tts-medium/);
  assert.match(masterMd, /MIT License/);
  assert.match(masterMd, /Iterasi 1\/5/);
  assert.match(masterMd, /Iterasi 5\/5/);
  assert.match(iter1Md, /GOOGLE_MAPS_ID_CORPUS\.json/);
  assert.match(iter1Md, /Handoff ke Iterasi 2\/5/);
});

test('Iteration 1/5: Google Maps Indonesian Corpus passes 100% directional safety invariants & covers all 5 modes', () => {
  const corpus = loadVoiceNavCorpus();
  const audit = validateCorpusSafetyInvariants(corpus);

  assert.equal(audit.valid, true, `Safety errors: ${audit.errors.join('; ')}`);
  assert.ok(audit.count >= 60, `Expected >= 60 canonical utterances, got ${audit.count}`);

  // Verify every transport mode has dedicated utterances
  for (const mode of ['foot', 'motorcycle', 'car', 'bus', 'train']) {
    const matches = corpus.utterances.filter((u) => u.modes.includes(mode));
    assert.ok(matches.length >= 4, `Expected >= 4 utterances for mode ${mode}`);
  }

  // Verify Hard Symbolic Filter NEVER returns a right-turn template when ground truth is left
  const leftCandidates = filterSafeCandidates(corpus, {
    directionLock: 'left',
    mode: 'motorcycle',
    hasRoadName: true,
  });
  assert.ok(leftCandidates.length >= 3);
  for (const c of leftCandidates) {
    assert.equal(c.directionLock, 'left');
    assert.doesNotMatch(c.template.toLowerCase(), /\bkanan\b/);
  }
});

test('Iteration 1/5: Pulau Jawa text normalizer & utterance renderer produce natural TTS Indonesian', () => {
  assert.equal(normalizeJavaRoadName('Jl. Jend. Sudirman'), 'Jalan Jenderal Sudirman');
  assert.equal(normalizeJavaRoadName('Gg. H. Nawi No. 12'), 'Gang Haji Nawi nomor 12');
  assert.equal(normalizeJavaRoadName('Tol JORR Km 14'), 'Tol Jor kilometer 14');
  assert.equal(normalizeJavaRoadName('St. Manggarai / Bundaran HI'), 'Stasiun Manggarai atau Bundaran Ha I');

  assert.equal(formatSpokenDistanceId(20), 'sekarang');
  assert.equal(formatSpokenDistanceId(250), '250 meter');
  assert.equal(formatSpokenDistanceId(1500), '1 koma 5 kilometer');
  assert.equal(formatExitOrdinalId(2), 'kedua');

  assert.equal(classifyJavaRoadContext({ roadName: 'Tol JORR' }), 'tol');
  assert.equal(classifyJavaRoadContext({ roadName: 'Gg. Kancil' }), 'gang');
  assert.equal(classifyJavaRoadContext({ roadName: 'Flyover Pasupati' }), 'flyover');
  assert.equal(classifyJavaRoadContext({ roadName: 'Bundaran HI' }), 'bundaran');
  assert.equal(classifyJavaRoadContext({ roadName: 'St. Sudirman', mode: 'train' }), 'stasiun');

  const corpus = loadVoiceNavCorpus();
  const left200 = corpus.utterances.find((u) => u.id === 'turn_left_approach_200_road');
  const rendered = renderUtteranceTemplate(left200, {
    distanceMeters: 200,
    roadName: 'Jl. Jend. Sudirman',
  });
  assert.equal(rendered, 'Dalam 200 meter, belok kiri ke Jalan Jenderal Sudirman.');
  assert.doesNotMatch(rendered, /\{|\}/);
});
