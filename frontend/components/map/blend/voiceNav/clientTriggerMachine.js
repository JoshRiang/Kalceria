/**
 * Client-Side Pure Real-Time Maneuver Trigger State Machine.
 *
 * ZERO `@/`, ZERO React, ZERO DOM, ZERO `node:*` — executes at < 0.1 ms directly
 * on the browser Focus Mode curated GPS stream.
 */

import { bucketizeDistanceMeters } from "./clientAttentionCore.js";

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

const OFF_ROUTE_TOLERANCE = {
  foot: 38,
  motorcycle: 55,
  car: 65,
  bus: 110,
  train: 130,
};

const COOLDOWNS = {
  normalSpeechMs: 3500,
  urgentPreemptFloorMs: 1200,
  rerouteAlertMs: 15000,
  trafficAlertMs: 90000,
};

function haversineMeters(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distancePointToSegmentMeters(pLat, pLng, aLat, aLng, bLat, bLng) {
  const mPerDegLat = 111132.0;
  const mPerDegLng = 111320.0 * Math.cos(pLat * DEG_TO_RAD);
  const ax = (aLng - pLng) * mPerDegLng;
  const ay = (aLat - pLat) * mPerDegLat;
  const bx = (bLng - pLng) * mPerDegLng;
  const by = (bLat - pLat) * mPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(ax, ay);
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function computeMinDistanceToRoute(lat, lng, segments = []) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  let best = Infinity;
  for (const seg of segments) {
    const pts = Array.isArray(seg?.points) ? seg.points : [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (!Array.isArray(a) || !Array.isArray(b)) continue;
      const d = distancePointToSegmentMeters(lat, lng, a[0], a[1], b[0], b[1]);
      if (d < best) best = d;
    }
  }
  return Number.isFinite(best) ? Number(best.toFixed(1)) : null;
}

export function createClientTriggerState(overrides = {}) {
  return {
    routeSignature: null,
    activeStepIndex: 0,
    departSpoken: false,
    arrivedSpoken: false,
    spokenStepStages: {},
    lastSpokenAtMs: 0,
    lastTrafficAlertAtMs: 0,
    lastRerouteAlertAtMs: 0,
    lastHazardStepIndex: -1,
    consecutiveOffRouteCount: 0,
    lastStepDistanceMeters: Infinity,
    ...overrides,
  };
}

function cloneState(st) {
  const stages = {};
  for (const [k, v] of Object.entries(st.spokenStepStages || {})) {
    stages[k] = { ...v };
  }
  return { ...st, spokenStepStages: stages };
}

function routeSignature(route, destination) {
  const steps = Array.isArray(route?.steps) ? route.steps : [];
  const dLat = Number.isFinite(Number(destination?.lat)) ? Number(destination.lat).toFixed(4) : "0";
  const dLng = Number.isFinite(Number(destination?.lng)) ? Number(destination.lng).toFixed(4) : "0";
  return [
    route?.provider || "unk",
    route?.mode || "foot",
    steps.length,
    steps[0]?.directionLock || "",
    steps[steps.length - 1]?.directionLock || "",
    dLat,
    dLng,
  ].join("|");
}

function getStepDist(step, lat, lng) {
  if (Number.isFinite(step?.lat) && Number.isFinite(step?.lng)) {
    return haversineMeters(lat, lng, step.lat, step.lng);
  }
  return Math.max(0, Number(step?.distanceMeters) || 0);
}

export function evaluateClientNavTick({
  state,
  route,
  gps,
  destination = null,
  eventTitle = "lokasi event",
  nowMs = Date.now(),
  engine,
} = {}) {
  const lat = Number(gps?.lat);
  const lng = Number(gps?.lng);
  if (!engine || !route || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      nextState: state ? cloneState(state) : createClientTriggerState(),
      trigger: null,
      upcomingStep: null,
    };
  }

  const sig = routeSignature(route, destination);
  const nextState =
    state && state.routeSignature === sig
      ? cloneState(state)
      : createClientTriggerState({ routeSignature: sig });

  const mode = String(route.mode || "foot").toLowerCase();
  const speedKmh = gps?.isStationary ? 0 : Math.max(0, Number(gps?.speed) || 0) * 3.6;
  const trafficState = String(route.trafficLevel || "FREE").toUpperCase();
  const steps = Array.isArray(route.steps) ? route.steps : [];
  const destLat = Number(destination?.lat ?? steps[steps.length - 1]?.lat);
  const destLng = Number(destination?.lng ?? steps[steps.length - 1]?.lng);
  const distToDest =
    Number.isFinite(destLat) && Number.isFinite(destLng)
      ? haversineMeters(lat, lng, destLat, destLng)
      : Infinity;
  const distToPoly = computeMinDistanceToRoute(lat, lng, route.segments);
  const elapsed = nowMs - (nextState.lastSpokenAtMs || 0);

  // 1. Arrival
  if (!nextState.arrivedSpoken && distToDest <= 28) {
    let arriveLock = "arrive_ahead";
    for (let i = steps.length - 1; i >= 0; i--) {
      if (["arrive_left", "arrive_right", "arrive_ahead"].includes(steps[i]?.directionLock)) {
        arriveLock = steps[i].directionLock;
        break;
      }
    }
    const decision = engine.infer(
      { mode, directionLock: arriveLock, distanceBucket: "immediate", roadClass: "lokal", trafficState, hasRoadName: false, speedKmh },
      { eventTitle, distanceMeters: Math.round(distToDest) }
    );
    nextState.arrivedSpoken = true;
    nextState.lastSpokenAtMs = nowMs;
    return {
      nextState,
      trigger: { reason: "arrival", priority: "urgent", distanceMeters: Math.round(distToDest), decision },
      upcomingStep: steps[steps.length - 1] || null,
    };
  }
  if (nextState.arrivedSpoken) {
    return { nextState, trigger: null, upcomingStep: steps[steps.length - 1] || null };
  }

  // 2. Depart
  if (!nextState.departSpoken && distToDest > 40) {
    const firstStep = steps[0] || {};
    const firstRoad = firstStep.roadName || steps[1]?.roadName || "";
    const decision = engine.infer(
      {
        mode,
        directionLock: "depart",
        distanceBucket: "immediate",
        roadClass: firstStep.roadClass || (mode === "train" ? "stasiun" : mode === "bus" ? "halte" : "lokal"),
        trafficState,
        hasRoadName: Boolean(firstRoad),
        speedKmh,
      },
      { roadName: firstRoad, eventTitle, distanceMeters: route.distanceMeters || 0 }
    );
    nextState.departSpoken = true;
    nextState.lastSpokenAtMs = nowMs;
    if (steps[0]?.directionLock === "depart" && steps.length > 1) nextState.activeStepIndex = 1;
    return {
      nextState,
      trigger: { reason: "depart", priority: "normal", distanceMeters: Math.round(distToDest), decision },
      upcomingStep: steps[nextState.activeStepIndex] || null,
    };
  }

  // 3. Debounced Off-Route
  const offLimit = OFF_ROUTE_TOLERANCE[mode] || 55;
  if (distToPoly !== null && distToPoly > offLimit) {
    nextState.consecutiveOffRouteCount += 1;
    const rerouteOk = nowMs - (nextState.lastRerouteAlertAtMs || 0) >= COOLDOWNS.rerouteAlertMs;
    if ((nextState.consecutiveOffRouteCount >= 2 || distToPoly > offLimit * 2.2) && rerouteOk) {
      const decision = engine.infer(
        { mode, directionLock: "reroute", distanceBucket: "immediate", roadClass: "lokal", trafficState, hasRoadName: false, speedKmh },
        { eventTitle }
      );
      nextState.lastRerouteAlertAtMs = nowMs;
      nextState.lastSpokenAtMs = nowMs;
      return {
        nextState,
        trigger: { reason: "off_route", priority: "urgent", distanceMeters: Math.round(distToPoly), decision },
        upcomingStep: steps[nextState.activeStepIndex] || null,
      };
    }
  } else {
    nextState.consecutiveOffRouteCount = 0;
  }

  // 4. Monotonic Step Cursor + Distance Cascade
  let stepIdx = Math.max(0, Math.min(steps.length - 1, nextState.activeStepIndex));
  while (stepIdx < steps.length - 1 && steps[stepIdx]?.directionLock === "depart") stepIdx += 1;

  while (stepIdx < steps.length - 1) {
    const curStep = steps[stepIdx];
    const nxtStep = steps[stepIdx + 1];
    const dCur = getStepDist(curStep, lat, lng);
    const dNxt = getStepDist(nxtStep, lat, lng);
    const stages = nextState.spokenStepStages[stepIdx] || {};
    const curDoneNow = Boolean(stages.now_25m || stages.immediate);
    const curApproached = Boolean(curDoneNow || stages.imminent_80m);
    const minPrev = Number.isFinite(nextState.lastStepDistanceMeters) ? nextState.lastStepDistanceMeters : dCur;
    const stepSpan =
      Number.isFinite(curStep?.lat) && Number.isFinite(nxtStep?.lat)
        ? haversineMeters(curStep.lat, curStep.lng, nxtStep.lat, nxtStep.lng)
        : Infinity;

    if (
      (curDoneNow && dCur > minPrev + 12 && dCur > 22) ||
      (curApproached && minPrev <= 60 && dCur > minPrev + 18 && dNxt < stepSpan) ||
      (curApproached && dCur > 25 && dNxt < dCur)
    ) {
      stepIdx += 1;
      nextState.lastStepDistanceMeters = Infinity;
    } else {
      break;
    }
  }

  nextState.activeStepIndex = stepIdx;
  const activeStep = steps[stepIdx] || null;
  const distToStep = activeStep ? getStepDist(activeStep, lat, lng) : Infinity;

  if (activeStep && !String(activeStep.directionLock || "").startsWith("arrive_")) {
    nextState.lastStepDistanceMeters = Math.min(nextState.lastStepDistanceMeters, distToStep);

    // Railway crossing hazard
    if (
      activeStep.roadClass === "perlintasan_ka" &&
      distToStep <= 200 &&
      nextState.lastHazardStepIndex !== stepIdx &&
      elapsed >= COOLDOWNS.urgentPreemptFloorMs
    ) {
      const decision = engine.infer(
        { mode, directionLock: "hazard", distanceBucket: "approach_200m", roadClass: "perlintasan_ka", trafficState, hasRoadName: false, speedKmh },
        { distanceMeters: Math.round(distToStep), roadName: activeStep.roadName }
      );
      nextState.lastHazardStepIndex = stepIdx;
      nextState.lastSpokenAtMs = nowMs;
      return {
        nextState,
        trigger: { reason: "hazard_rail_crossing", priority: "urgent", distanceMeters: Math.round(distToStep), decision },
        upcomingStep: { ...activeStep, liveDistanceMeters: Math.round(distToStep) },
      };
    }

    const bucket = bucketizeDistanceMeters(distToStep, { mode, speedKmh });
    const stageMap = nextState.spokenStepStages[stepIdx] || {};
    const farAllowed =
      bucket !== "far_1000m" ||
      activeStep.roadClass === "tol" ||
      speedKmh >= 45 ||
      activeStep.directionLock === "ramp_enter" ||
      activeStep.directionLock === "ramp_exit" ||
      activeStep.directionLock === "straight";
    const prepAllowed =
      bucket !== "prepare_500m" || mode !== "foot" || activeStep.directionLock === "straight" || activeStep.directionLock === "transit_walk";
    const urgent = bucket === "now_25m" || bucket === "immediate" || bucket === "imminent_80m";
    const minCooldown = urgent ? COOLDOWNS.urgentPreemptFloorMs : COOLDOWNS.normalSpeechMs;

    if (!stageMap[bucket] && farAllowed && prepAllowed && elapsed >= minCooldown) {
      const decision = engine.infer(
        {
          mode,
          directionLock: activeStep.directionLock,
          distanceBucket: bucket,
          distanceMeters: distToStep,
          roadClass: activeStep.roadClass || "lokal",
          trafficState,
          hasRoadName: Boolean(activeStep.roadName),
          hasChainedNext: Boolean(activeStep.hasChainedNext),
          chainedDirectionLock: activeStep.chainedDirectionLock || null,
          speedKmh,
          isEndOfRoad: Boolean(activeStep.isEndOfRoad),
          isNewRoadName: Boolean(activeStep.isNewRoadName),
        },
        {
          roadName: activeStep.roadName,
          distanceMeters: Math.round(distToStep),
          exitNumber: activeStep.exitNumber,
          stopName: activeStep.stopName,
          destStopName: activeStep.destStopName,
          lineName: activeStep.lineName,
          eventTitle,
        }
      );
      nextState.spokenStepStages[stepIdx] = { ...stageMap, [bucket]: true };
      nextState.lastSpokenAtMs = nowMs;
      return {
        nextState,
        trigger: { reason: "maneuver", priority: urgent ? "urgent" : "normal", distanceMeters: Math.round(distToStep), decision },
        upcomingStep: { ...activeStep, liveDistanceMeters: Math.round(distToStep) },
      };
    }
  }

  // 5. TomTom Live Traffic Alert
  const delaySec = Number(route.trafficDelaySeconds || 0);
  if (
    (trafficState === "JAM" || trafficState === "SLOW") &&
    delaySec >= 120 &&
    mode !== "foot" &&
    mode !== "train" &&
    nowMs - (nextState.lastTrafficAlertAtMs || 0) >= COOLDOWNS.trafficAlertMs &&
    elapsed >= COOLDOWNS.normalSpeechMs + 1000
  ) {
    const roadName = activeStep?.roadName || "";
    const decision = engine.infer(
      { mode, directionLock: "traffic", distanceBucket: "prepare_500m", roadClass: activeStep?.roadClass || "arteri", trafficState, hasRoadName: Boolean(roadName), speedKmh },
      { roadName, delayMin: Math.max(2, Math.round(delaySec / 60)) }
    );
    nextState.lastTrafficAlertAtMs = nowMs;
    nextState.lastSpokenAtMs = nowMs;
    return {
      nextState,
      trigger: { reason: "traffic_ahead", priority: "advisory", distanceMeters: Math.round(Number(route.distanceMeters || 0)), decision },
      upcomingStep: activeStep ? { ...activeStep, liveDistanceMeters: Number.isFinite(distToStep) ? Math.round(distToStep) : null } : null,
    };
  }

  return {
    nextState,
    trigger: null,
    upcomingStep: activeStep
      ? { ...activeStep, liveDistanceMeters: Number.isFinite(distToStep) ? Math.round(distToStep) : null }
      : null,
  };
}

