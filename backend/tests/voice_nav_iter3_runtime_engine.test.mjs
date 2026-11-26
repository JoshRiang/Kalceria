import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getDefaultJavaAttentionEngine,
  loadVoiceNavRuntimeBundle,
  bucketizeDistanceMeters,
  encodeContextVector30,
} from '../services/voiceNav/attentionInferenceEngine.js';
import {
  createVoiceNavTriggerState,
  evaluateNavigationTick,
  distancePointToSegmentMeters,
  computeMinDistanceToRouteMeters,
} from '../services/voiceNav/maneuverTriggerStateMachine.js';

test('Iteration 3/5: bundled modelData JSONs stay byte-identical with data/voice_nav_java/ & vercel.json includes modelData', () => {
  const files = ['GOOGLE_MAPS_ID_CORPUS.json', 'JAVA_ATTENTION_WEIGHTS_V1.json'];
  for (const name of files) {
    const rootContent = fs.readFileSync(path.resolve('data/voice_nav_java', name), 'utf8');
    const bundledContent = fs.readFileSync(path.resolve('backend/services/voiceNav/modelData', name), 'utf8');
    assert.equal(bundledContent, rootContent, `${name} drifted between data/voice_nav_java and backend modelData!`);
  }
  const vercelCfg = JSON.parse(fs.readFileSync(path.resolve('backend/vercel.json'), 'utf8'));
  const includeFiles = vercelCfg.builds?.[0]?.config?.includeFiles || [];
  assert.ok(includeFiles.includes('services/voiceNav/modelData/**'));
});

test('Iteration 3/5: Pure JS Vector-Attention engine achieves < 1ms latency & 100% hard directional safety across all locks', () => {
  const engine = getDefaultJavaAttentionEngine();
  const { corpus } = loadVoiceNavRuntimeBundle();

  // 1. Verify sub-millisecond inference over 1,000 live calls
  const tStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    const res = engine.infer(
      {
        mode: i % 2 === 0 ? 'motorcycle' : 'car',
        directionLock: i % 2 === 0 ? 'left' : 'right',
        distanceMeters: 160,
        roadClass: i % 2 === 0 ? 'gang' : 'arteri',
        trafficState: 'FREE',
        hasRoadName: true,
        speedKmh: 36,
      },
      { roadName: i % 2 === 0 ? 'Gg. H. Nawi' : 'Jl. Jend. Sudirman', distanceMeters: 160 }
    );
    assert.equal(res.directionSafe, true);
  }
  const avgMs = (performance.now() - tStart) / 1000;
  assert.ok(avgMs < 1.0, `Expected < 1.0 ms avg latency, got ${avgMs.toFixed(4)} ms`);

  // 2. Exhaustive directional safety audit across every directionLock in corpus
  const LEFT_ONLY = new Set(['left', 'slight_left', 'sharp_left', 'keep_left', 'merge_left', 'arrive_left', 'chained_ll']);
  const RIGHT_ONLY = new Set(['right', 'slight_right', 'sharp_right', 'keep_right', 'merge_right', 'arrive_right', 'chained_rr']);

  for (const lock of corpus.featureSchema.directionLocks) {
    for (const mode of ['foot', 'motorcycle', 'car', 'bus', 'train']) {
      const dec = engine.infer(
        {
          mode,
          directionLock: lock,
          distanceBucket: 'approach_200m',
          roadClass: 'arteri',
          trafficState: 'FREE',
          hasRoadName: true,
          speedKmh: 40,
        },
        { roadName: 'Jl. MH Thamrin', distanceMeters: 180, exitNumber: 2 }
      );
      assert.equal(dec.directionLock, lock, `Direction lock drifted for ${lock}/${mode}`);
      assert.equal(dec.directionSafe, true);
      assert.doesNotMatch(dec.spokenText, /\{|\}/, `Unfilled template placeholder in ${dec.utteranceId}`);

      const lower = dec.spokenText.toLowerCase();
      if (LEFT_ONLY.has(lock)) {
        assert.doesNotMatch(lower, /\bkanan\b/, `Safety violation: left lock ${lock} spoke "kanan"!`);
      }
      if (RIGHT_ONLY.has(lock)) {
        assert.doesNotMatch(lower, /\bkiri\b/, `Safety violation: right lock ${lock} spoke "kiri"!`);
      }
    }
  }

  // 3. Speed-adaptive Pulau Jawa distance bucketing (Tol 85 km/h anticipates earlier than walking 5 km/h)
  assert.equal(bucketizeDistanceMeters(50, { mode: 'foot', speedKmh: 5 }), 'imminent_80m');
  assert.equal(bucketizeDistanceMeters(50, { mode: 'car', speedKmh: 85 }), 'now_25m');
  assert.equal(encodeContextVector30({ mode: 'motorcycle', isEndOfRoad: true, isNewRoadName: false })[28], 1);
});

test('Iteration 3/5: Real-time Pulau Jawa driving simulation verifies cascade, anti-spam, chained turns, debounced off-route, traffic & arrival', () => {
  const engine = getDefaultJavaAttentionEngine();

  // Simulated Jakarta Motorcycle Route: Jl. Jend. Sudirman -> Left into Gg. H. Nawi (chained right 45m) -> Bundaran HI -> Event
  const route = {
    provider: 'osrm-java-docker',
    mode: 'motorcycle',
    distanceMeters: 900,
    durationSeconds: 180,
    trafficLevel: 'JAM',
    trafficDelaySeconds: 360, // +6 min macet
    segments: [
      {
        kind: 'road',
        points: [
          [-6.215, 106.82],
          [-6.21, 106.82],
          [-6.208, 106.82],
          [-6.206, 106.82],
        ],
      },
    ],
    steps: [
      {
        index: 0,
        maneuverType: 'depart',
        directionLock: 'depart',
        roadName: 'Jl. Jend. Sudirman',
        roadClass: 'arteri',
        distanceMeters: 550,
        lat: -6.215,
        lng: 106.82,
      },
      {
        index: 1,
        maneuverType: 'turn',
        directionLock: 'left',
        roadName: 'Gg. H. Nawi',
        roadClass: 'gang',
        distanceMeters: 45,
        lat: -6.21,
        lng: 106.82,
        hasChainedNext: true,
        chainedDirectionLock: 'chained_lr',
      },
      {
        index: 2,
        maneuverType: 'roundabout',
        directionLock: 'roundabout',
        roadName: 'Bundaran HI',
        roadClass: 'bundaran',
        exitNumber: 2,
        distanceMeters: 220,
        lat: -6.208,
        lng: 106.82,
      },
      {
        index: 3,
        maneuverType: 'arrive',
        directionLock: 'arrive_left',
        roadName: 'Kopi Kalcer Menteng',
        roadClass: 'lokal',
        distanceMeters: 0,
        lat: -6.206,
        lng: 106.82,
      },
    ],
  };

  const destination = { lat: -6.206, lng: 106.82 };
  let state = createVoiceNavTriggerState();
  let t = 1_000_000;

  // Tick 1: Departure greeting (Motorcycle non-toll on Jl. Jend. Sudirman!)
  let res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.215, lng: 106.82, speed: 6, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  assert.equal(res.trigger?.reason, 'depart');
  assert.equal(res.trigger?.decision.utteranceId, 'depart_motorcycle_notoll');
  assert.match(res.trigger?.decision.spokenText, /Rute motor non tol aktif menuju Jalan Jenderal Sudirman/);

  // Tick 2 (5s later): 480m from step 1 -> prepare_500m
  t += 5000;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.2143, lng: 106.82, speed: 8, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  assert.equal(res.trigger?.reason, 'maneuver');
  assert.equal(res.trigger?.distanceBucket, 'prepare_500m');
  assert.equal(res.trigger?.decision.directionLock, 'left');

  // Tick 3 (4s later, still ~450m in prepare_500m): ANTI-SPAM must NOT repeat prepare_500m!
  t += 4000;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.214, lng: 106.82, speed: 8, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  // Since prepare_500m is deduplicated AND elapsedSinceSpeech < 4500ms, tick 3 is silent!
  assert.equal(res.trigger, null);

  // Tick 4 (5s later, still cruising in prepare_500m): TomTom JAM traffic alert fires once!
  t += 5000;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.2136, lng: 106.82, speed: 8, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  assert.equal(res.trigger?.reason, 'traffic_ahead');
  assert.equal(res.trigger?.decision.utteranceId, 'traffic_jam_ahead_delay');
  assert.match(res.trigger?.decision.spokenText, /6 menit/);

  // Tick 5 (10s later): 165m from step 1 (chained_lr!) -> promotes to chain_left_then_right!
  t += 10000;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.2115, lng: 106.82, speed: 7, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  assert.equal(res.trigger?.reason, 'maneuver');
  assert.equal(res.trigger?.decision.utteranceId, 'chain_left_then_right');
  assert.match(res.trigger?.decision.spokenText, /belok kiri, lalu segera belok kanan/i);

  // Tick 6 (1.5s later — URGENT PREEMPTION!): 20m from step 1 -> preempts 3.5s normal cooldown!
  t += 1500;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.21018, lng: 106.82, speed: 6, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  assert.equal(res.trigger?.reason, 'maneuver');
  assert.equal(res.trigger?.distanceBucket, 'now_25m');
  assert.equal(res.trigger?.decision.utteranceId, 'turn_left_now');

  // Tick 7 (6s later): User completed step 1 and moved 50m north toward step 2 (Bundaran HI, ~170m away!)
  // Monotonic step progression advances activeStepIndex -> 2 and announces Bundaran HI exit 2!
  t += 6000;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.20955, lng: 106.82, speed: 7, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  assert.equal(state.activeStepIndex, 2);
  assert.equal(res.trigger?.reason, 'maneuver');
  assert.equal(res.trigger?.decision.directionLock, 'roundabout');
  assert.match(res.trigger?.decision.spokenText, /kedua.*Bundaran Ha I/i);

  // Tick 8: Single noisy GPS glitch 80m off-route -> DEBOUNCED (no false reroute!)
  t += 4000;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.2092, lng: 106.82075, speed: 7, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  assert.notEqual(res.trigger?.reason, 'off_route');
  assert.equal(state.consecutiveOffRouteCount, 1);

  // Tick 9: 2nd consecutive off-route tick (80m off corridor) -> fires reroute!
  t += 2000;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.2091, lng: 106.82078, speed: 7, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  assert.equal(res.trigger?.reason, 'off_route');
  assert.equal(res.trigger?.decision.utteranceId, 'off_route_recalculating');

  // Tick 10: Arrival within 15m of destination -> arrive_left_event!
  t += 2000;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.2061, lng: 106.82, speed: 2, isStationary: false },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  state = res.nextState;
  assert.equal(res.trigger?.reason, 'arrival');
  assert.equal(res.trigger?.decision.utteranceId, 'arrive_left_event');
  assert.equal(state.arrivedSpoken, true);

  // Tick 11: After arrival, engine stays silent
  t += 5000;
  res = evaluateNavigationTick({
    state,
    route,
    gps: { lat: -6.206, lng: 106.82, speed: 0, isStationary: true },
    destination,
    eventTitle: 'Ngopi Santai',
    nowMs: t,
    engine,
  });
  assert.equal(res.trigger, null);
});

test('Iteration 3/5: Perpendicular polyline distance & backend voice-nav routes are cleanly wired', () => {
  // Point on exact midpoint of segment has ~0m perpendicular distance (NOT vertex distance!)
  const midDist = distancePointToSegmentMeters(-6.21, 106.82, -6.22, 106.82, -6.20, 106.82);
  assert.ok(midDist < 1.0, `Expected <1m on segment midpoint, got ${midDist}m`);

  const minPoly = computeMinDistanceToRouteMeters(-6.21, 106.82, [
    { points: [[-6.22, 106.82], [-6.20, 106.82]] },
  ]);
  assert.ok(minPoly !== null && minPoly < 1.0);

  const routesSrc = fs.readFileSync(path.resolve('backend/routes/index.js'), 'utf8');
  assert.match(routesSrc, /\/map\/voice-nav\/bundle/);
  assert.match(routesSrc, /\/map\/voice-nav\/evaluate/);
});

