import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  extractStepsFromOsrmLeg,
  extractStepsFromTomTomGuidance,
  extractStepsFromTransitSegments,
  annotateChainedTurns,
} from '../services/voiceNav/routeStepExtractor.js';
import { loadVoiceNavCorpus, validateCorpusSafetyInvariants } from '../services/voiceNav/corpusRegistry.js';

test('Iteration 2/5: routeStepExtractor normalizes OSRM, TomTom, Transit steps & chains <= 65m maneuvers safely', () => {
  const osrmLeg = {
    steps: [
      {
        name: 'Jl. Jend. Sudirman',
        distance: 45,
        duration: 12,
        maneuver: { type: 'turn', modifier: 'left', location: [106.8229, -6.2088] },
      },
      {
        name: 'Gg. H. Nawi',
        distance: 110,
        duration: 28,
        maneuver: { type: 'turn', modifier: 'right', location: [106.8234, -6.2085] },
      },
      {
        name: 'Bundaran HI',
        distance: 220,
        duration: 30,
        maneuver: { type: 'roundabout', modifier: 'right', exit: 2, location: [106.823, -6.195] },
      },
      {
        name: 'Jl. MH Thamrin',
        distance: 80,
        duration: 15,
        maneuver: { type: 'end of road', modifier: 'left', location: [106.823, -6.192] },
      },
      {
        name: 'Jl. Medan Merdeka Barat',
        distance: 300,
        duration: 45,
        maneuver: { type: 'new name', modifier: 'straight', location: [106.8225, -6.188] },
      },
    ],
  };

  const osrmSteps = extractStepsFromOsrmLeg(osrmLeg, 'motorcycle');
  assert.equal(osrmSteps.length, 5);
  assert.equal(osrmSteps[0].directionLock, 'left');
  assert.equal(osrmSteps[0].hasChainedNext, true);
  assert.equal(osrmSteps[0].chainedDirectionLock, 'chained_lr');
  assert.equal(osrmSteps[0].spokenRoadName, 'Jalan Jenderal Sudirman');
  assert.equal(osrmSteps[1].roadClass, 'gang');
  assert.equal(osrmSteps[2].directionLock, 'roundabout');
  assert.equal(osrmSteps[2].exitNumber, 2);
  assert.equal(osrmSteps[2].roadClass, 'bundaran');
  assert.equal(osrmSteps[3].isEndOfRoad, true);
  assert.equal(osrmSteps[4].isNewRoadName, true);

  const tomTomSteps = extractStepsFromTomTomGuidance(
    {
      instructions: [
        { maneuver: 'DEPART', street: 'Tol JORR', routeOffsetInMeters: 0, travelTimeInSeconds: 0, point: { latitude: -6.28, longitude: 106.79 } },
        { maneuver: 'TAKE_EXIT', street: 'Jl. TB Simatupang', routeOffsetInMeters: 1200, travelTimeInSeconds: 65, point: { latitude: -6.29, longitude: 106.8 } },
        { maneuver: 'ARRIVE_RIGHT', street: 'Jl. Kemang Raya', routeOffsetInMeters: 1500, travelTimeInSeconds: 95, point: { latitude: -6.27, longitude: 106.81 } },
      ],
    },
    'car'
  );
  assert.equal(tomTomSteps.length, 3);
  assert.equal(tomTomSteps[0].directionLock, 'depart');
  assert.equal(tomTomSteps[0].distanceMeters, 1200);
  assert.equal(tomTomSteps[0].roadClass, 'tol');
  assert.equal(tomTomSteps[1].directionLock, 'ramp_exit');
  assert.equal(tomTomSteps[2].directionLock, 'arrive_right');

  const transitSteps = extractStepsFromTransitSegments(
    [
      { kind: 'walk', points: [[-6.21, 106.82], [-6.209, 106.821]] },
      { kind: 'train', label: 'KRL Bogor Line', points: [[-6.209, 106.821], [-6.18, 106.83]] },
      { kind: 'walk', points: [[-6.18, 106.83], [-6.178, 106.832]] },
    ],
    [
      { name: 'St. Sudirman', lat: -6.209, lng: 106.821, role: 'board' },
      { name: 'St. Gondangdia', lat: -6.18, lng: 106.83, role: 'alight' },
    ],
    'train'
  );
  assert.equal(transitSteps.length, 4);
  assert.equal(transitSteps[0].directionLock, 'transit_walk');
  assert.equal(transitSteps[1].directionLock, 'transit_board');
  assert.equal(transitSteps[2].directionLock, 'transit_alight');
  assert.equal(transitSteps[3].directionLock, 'arrive_ahead');

  const nonChained = annotateChainedTurns([
    { directionLock: 'left', distanceMeters: 250 },
    { directionLock: 'right', distanceMeters: 180 },
  ]);
  assert.equal(nonChained[0].hasChainedNext, false);
  assert.equal(nonChained[0].chainedDirectionLock, null);
});

test('Iteration 2/5: JAVA_ATTENTION_WEIGHTS_V1.json & TRAINING_REPORT_ITER2.json pass shape, size, safety & forward-pass parity checks', () => {
  const weightsPath = path.resolve('data/voice_nav_java/JAVA_ATTENTION_WEIGHTS_V1.json');
  const reportPath = path.resolve('data/voice_nav_java/TRAINING_REPORT_ITER2.json');
  const iter2Md = fs.readFileSync(path.resolve('docs/ITERATION_2_JAVA_ATTENTION_TRAINING.md'), 'utf8');

  assert.match(iter2Md, /JAVA_ATTENTION_WEIGHTS_V1\.json/);
  assert.match(iter2Md, /Handoff ke Iterasi 3\/5/);

  const stats = fs.statSync(weightsPath);
  assert.ok(stats.size > 5000 && stats.size < 65 * 1024, `Unexpected weights size: ${stats.size} bytes`);

  const weights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const corpus = loadVoiceNavCorpus();

  assert.equal(validateCorpusSafetyInvariants(corpus).valid, true);
  assert.equal(weights.architecture.featureDim, 30);
  assert.equal(weights.architecture.numHeads, 4);
  assert.equal(weights.architecture.headDim, 8);
  assert.equal(weights.architecture.numUtterances, corpus.utterances.length);
  assert.equal(weights.W_Q.length, 4);
  assert.equal(weights.W_Q[0].length, 30);
  assert.equal(weights.W_Q[0][0].length, 8);
  assert.equal(weights.W_K.length, 4);
  assert.equal(weights.corpusEmbeddings.length, corpus.utterances.length);
  assert.equal(weights.corpusEmbeddings[0].length, 30);
  assert.deepEqual(
    weights.utteranceIds,
    corpus.utterances.map((u) => u.id)
  );

  // Verify held-out test metrics from real Python training
  assert.equal(report.test.directionalSafetyPct, 100);
  assert.ok(report.test.top1AccuracyPct >= 99.0, `Expected >=99% test acc, got ${report.test.top1AccuracyPct}`);

  // Forward-pass parity check: motorcycle turning left into a narrow Pulau Jawa "gang" in 120m (approach_200m)
  const x = new Array(30).fill(0);
  x[1] = 1; // motorcycle
  x[7] = 1; // approach_200m
  x[14] = 1; // gang (11 + 3)
  x[21] = 1; // FREE
  x[25] = 1; // hasRoadName
  x[27] = 18 / 90; // ~18 km/h slow in gang

  const E = weights.corpusEmbeddings;
  const N = E.length;
  const logits = [...weights.bias];
  const scale = 1 / Math.sqrt(8);

  for (let h = 0; h < 4; h++) {
    const q = new Array(8).fill(0);
    for (let d = 0; d < 8; d++) {
      let s = 0;
      for (let f = 0; f < 30; f++) s += x[f] * weights.W_Q[h][f][d];
      q[d] = s;
    }
    const hs = weights.headScale[h];
    for (let i = 0; i < N; i++) {
      let dot = 0;
      for (let d = 0; d < 8; d++) {
        let kd = 0;
        for (let f = 0; f < 30; f++) kd += E[i][f] * weights.W_K[h][f][d];
        dot += q[d] * kd;
      }
      logits[i] += hs * dot * scale;
    }
  }

  // Apply Layer 1 Hard Symbolic Direction Mask for directionLock === 'left'
  let bestIdx = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < N; i++) {
    if (corpus.utterances[i].directionLock !== 'left') continue;
    if (logits[i] > bestScore) {
      bestScore = logits[i];
      bestIdx = i;
    }
  }
  assert.equal(weights.utteranceIds[bestIdx], 'turn_left_gang_moto_foot');
});

test('Iteration 2/5: routing services wire real-time steps=true & instructionsType=coded', () => {
  const routingSrc = fs.readFileSync(path.resolve('backend/services/blendRoutingService.js'), 'utf8');
  const transitSrc = fs.readFileSync(path.resolve('backend/services/blendTransitService.js'), 'utf8');

  assert.match(routingSrc, /steps=true/);
  assert.match(routingSrc, /instructionsType:\s*'coded'/);
  assert.match(routingSrc, /extractStepsFromOsrmLeg/);
  assert.match(routingSrc, /extractStepsFromTomTomGuidance/);
  assert.match(transitSrc, /extractStepsFromTransitSegments/);
});

