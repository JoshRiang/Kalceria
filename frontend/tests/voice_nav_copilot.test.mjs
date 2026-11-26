import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createClientAttentionEngine,
  normalizeJavaRoadName,
  bucketizeDistanceMeters,
} from "../components/map/blend/voiceNav/clientAttentionCore.js";
import {
  createClientTriggerState,
  evaluateClientNavTick,
} from "../components/map/blend/voiceNav/clientTriggerMachine.js";
import { getDefaultJavaAttentionEngine } from "../../backend/services/voiceNav/attentionInferenceEngine.js";

test("Iteration 5/5: Frontend clientAttentionCore matches Backend Vector-Attention engine 100% across all 66 utterances", () => {
  const corpus = JSON.parse(
    fs.readFileSync(path.resolve("data/voice_nav_java/GOOGLE_MAPS_ID_CORPUS.json"), "utf8")
  );
  const weights = JSON.parse(
    fs.readFileSync(path.resolve("data/voice_nav_java/JAVA_ATTENTION_WEIGHTS_V1.json"), "utf8")
  );

  const clientEng = createClientAttentionEngine({ weights, corpus });
  const backendEng = getDefaultJavaAttentionEngine();

  let exactMatches = 0;
  for (const u of corpus.utterances) {
    const ctx = {
      mode: u.modes[0],
      directionLock: u.directionLock,
      distanceBucket: u.distanceBuckets[0],
      roadClass: u.roadClasses.find((r) => r !== "any") || "arteri",
      trafficState: u.trafficStates[0],
      hasRoadName: Boolean(u.requiresRoad),
      speedKmh: 38,
      isEndOfRoad: u.maneuverType === "end_of_road",
      isNewRoadName: u.maneuverType === "new_name",
    };
    const slots = {
      roadName: "Jl. Jend. Sudirman",
      distanceMeters: 180,
      exitNumber: 2,
      delayMin: 6,
      eventTitle: "Kopi Sore",
      stopName: "St. Sudirman",
      destStopName: "St. Manggarai",
      lineName: "KRL Bogor Line",
    };

    const fe = clientEng.infer(ctx, slots);
    const be = backendEng.infer(ctx, slots);
    assert.equal(fe.utteranceId, be.utteranceId, `Mismatch on ${u.id}: FE=${fe.utteranceId} vs BE=${be.utteranceId}`);
    assert.equal(fe.spokenText, be.spokenText);
    assert.equal(fe.directionSafe, true);
    exactMatches += 1;
  }

  assert.equal(exactMatches, corpus.utterances.length);
  assert.equal(normalizeJavaRoadName("Jl. TB Simatupang / Bundaran HI"), "Jalan Te Be Simatupang atau Bundaran Ha I");
  assert.equal(bucketizeDistanceMeters(50, { mode: "car", speedKmh: 85 }), "now_25m");
});

test("Iteration 5/5: Frontend clientTriggerMachine drives real-time depart -> maneuver -> arrival smoothly", () => {
  const corpus = JSON.parse(
    fs.readFileSync(path.resolve("data/voice_nav_java/GOOGLE_MAPS_ID_CORPUS.json"), "utf8")
  );
  const weights = JSON.parse(
    fs.readFileSync(path.resolve("data/voice_nav_java/JAVA_ATTENTION_WEIGHTS_V1.json"), "utf8")
  );
  const engine = createClientAttentionEngine({ weights, corpus });

  const route = {
    provider: "osrm-java-docker",
    mode: "foot",
    distanceMeters: 300,
    trafficLevel: "FREE",
    segments: [{ kind: "walk", points: [[-6.21, 106.82], [-6.2085, 106.82], [-6.2073, 106.82]] }],
    steps: [
      { index: 0, directionLock: "depart", roadName: "Jl. Sabang", roadClass: "lokal", lat: -6.21, lng: 106.82 },
      { index: 1, directionLock: "right", roadName: "Gg. H. Agus Salim", roadClass: "gang", lat: -6.2085, lng: 106.82 },
      { index: 2, directionLock: "arrive_right", roadName: "Kopi Sabang", roadClass: "lokal", lat: -6.2073, lng: 106.82 },
    ],
  };
  const dest = { lat: -6.2073, lng: 106.82 };

  let st = createClientTriggerState();
  let tick = evaluateClientNavTick({
    state: st,
    route,
    gps: { lat: -6.21, lng: 106.82, speed: 1.3, isStationary: false },
    destination: dest,
    eventTitle: "Kopi Sabang",
    nowMs: 10000,
    engine,
  });
  st = tick.nextState;
  assert.equal(tick.trigger?.reason, "depart");
  assert.equal(tick.trigger?.decision.utteranceId, "depart_foot_walk");

  // Approach right into narrow gang (150m away)
  tick = evaluateClientNavTick({
    state: st,
    route,
    gps: { lat: -6.20985, lng: 106.82, speed: 1.3, isStationary: false },
    destination: dest,
    eventTitle: "Kopi Sabang",
    nowMs: 16000,
    engine,
  });
  st = tick.nextState;
  assert.equal(tick.trigger?.reason, "maneuver");
  assert.equal(tick.trigger?.decision.utteranceId, "turn_right_gang_moto_foot");

  // Arrive within 15m
  tick = evaluateClientNavTick({
    state: st,
    route,
    gps: { lat: -6.2074, lng: 106.82, speed: 0.8, isStationary: false },
    destination: dest,
    eventTitle: "Kopi Sabang",
    nowMs: 25000,
    engine,
  });
  assert.equal(tick.trigger?.reason, "arrival");
  assert.equal(tick.trigger?.decision.utteranceId, "arrive_right_event");
});

test("Iteration 5/5: Focus Mode HUD, MapBlendController, api.js & soundEngine.js wire Voice Co-Pilot & audio ducking cleanly", () => {
  const hudSrc = fs.readFileSync(path.resolve("frontend/components/map/blend/BlendFocusHud.jsx"), "utf8");
  const ctrlSrc = fs.readFileSync(path.resolve("frontend/components/map/blend/MapBlendController.jsx"), "utf8");
  const apiSrc = fs.readFileSync(path.resolve("frontend/lib/api.js"), "utf8");
  const soundSrc = fs.readFileSync(path.resolve("frontend/lib/soundEngine.js"), "utf8");
  const iter5Md = fs.readFileSync(path.resolve("docs/ITERATION_5_COPILOT_PRODUCTION_LAUNCH.md"), "utf8");

  assert.match(hudSrc, /AI Voice Co-Pilot/);
  assert.match(hudSrc, /ManeuverDirectionGlyph/);
  assert.match(hudSrc, /VoiceSpeakerIcon/);
  assert.match(ctrlSrc, /useBlendVoiceCoPilot/);
  assert.match(apiSrc, /fetchVoiceNavBundle/);
  assert.match(apiSrc, /requestVoiceNavSpeak/);
  assert.match(soundSrc, /getVoiceNavDuckingFactor/);
  assert.match(soundSrc, /__kalceriaVoiceNavSpeaking/);
  assert.match(iter5Md, /5 \/ 5/);
});

