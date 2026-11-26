/**
 * Real-Time Road-Ahead Maneuver & Distance Trigger State Machine (Pure Isomorphic Module).
 *
 * ZERO `node:*`, ZERO React, ZERO DOM imports — runs identically on Node.js backend
 * and inside the browser Focus Mode Co-Pilot loop (1-2 Hz curated GPS stream).
 *
 * Responsibilities:
 * 1. Exact perpendicular distance to route polyline for debounced off-route / reroute detection
 * 2. Monotonic step cursor progression along OSRM / TomTom / Transitous `route.steps[]`
 * 3. Speed-adaptive distance trigger cascade (`1000m -> 500m -> 200m -> 80m -> 25m`)
 * 4. Anti-spam per-step/stage deduplication + global cooldown with urgent preemption
 * 5. Chained maneuver promotion (`<= 65m`), railway crossing hazard & TomTom live traffic alerts
 */

import { bucketizeDistanceMeters } from './attentionCore.js';

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

export const OFF_ROUTE_TOLERANCE_BY_MODE = Object.freeze({
  foot: 38,
  motorcycle: 55,
  car: 65,
  bus: 110,
  train: 130,
});

export const TRIGGER_COOLDOWNS_MS = Object.freeze({
  normalSpeechMs: 3500,
  urgentPreemptFloorMs: 1200,
  rerouteAlertMs: 15000,
  trafficAlertMs: 90000,
});

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Perpendicular distance from GPS point P to polyline segment AB using a local
 * equirectangular tangent plane (sub-0.1m precision at Pulau Jawa latitudes -6..-8 deg).
 */
export function distancePointToSegmentMeters(pLat, pLng, aLat, aLng, bLat, bLng) {
  const cosLat = Math.cos(pLat * DEG_TO_RAD);
  const mPerDegLat = 111132.0;
  const mPerDegLng = 111320.0 * cosLat;

  const ax = (aLng - pLng) * mPerDegLng;
  const ay = (aLat - pLat) * mPerDegLat;
  const bx = (bLng - pLng) * mPerDegLng;
  const by = (bLat - pLat) * mPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(ax, ay);

  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(projX, projY);
}

export function computeMinDistanceToRouteMeters(lat, lng, segments = []) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Array.isArray(segments) || segments.length === 0) {
    return null;
  }
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
    if (pts.length === 1 && Array.isArray(pts[0])) {
      const d = haversineMeters(lat, lng, pts[0][0], pts[0][1]);
      if (d < best) best = d;
    }
  }
  return Number.isFinite(best) ? Number(best.toFixed(1)) : null;
}

export function computeRouteSignature(route, destination) {
  if (!route) return 'none';
  const steps = Array.isArray(route.steps) ? route.steps : [];
  const firstStep = steps[0] || {};
  const lastStep = steps[steps.length - 1] || {};
  const dLat = Number.isFinite(Number(destination?.lat)) ? Number(destination.lat).toFixed(4) : '0';
  const dLng = Number.isFinite(Number(destination?.lng)) ? Number(destination.lng).toFixed(4) : '0';
  return [
    route.provider || 'unk',
    route.mode || 'foot',
    steps.length,
    firstStep.directionLock || '',
    lastStep.directionLock || '',
    dLat,
    dLng,
  ].join('|');
}

export function createVoiceNavTriggerState(overrides = {}) {
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
  const clonedStages = {};
  for (const [k, v] of Object.entries(st.spokenStepStages || {})) {
    clonedStages[k] = { ...v };
  }
  return {
    ...st,
    spokenStepStages: clonedStages,
  };
}

function isStageAllowedForContext(bucket, step, mode, speedKmh) {
  if (bucket === 'far_1000m') {
    return (
      step.roadClass === 'tol' ||
      speedKmh >= 45 ||
      step.directionLock === 'ramp_enter' ||
      step.directionLock === 'ramp_exit' ||
      step.directionLock === 'straight'
    );
  }
  if (bucket === 'prepare_500m') {
    if (mode === 'foot') return step.directionLock === 'straight' || step.directionLock === 'transit_walk';
    return true;
  }
  return true;
}

function isUrgentBucket(bucket, directionLock) {
  return (
    bucket === 'now_25m' ||
    bucket === 'immediate' ||
    bucket === 'imminent_80m' ||
    directionLock === 'hazard' ||
    String(directionLock).startsWith('arrive_')
  );
}

function resolveArrivalLock(steps = []) {
  for (let i = steps.length - 1; i >= 0; i--) {
    const lock = steps[i]?.directionLock;
    if (lock === 'arrive_left' || lock === 'arrive_right' || lock === 'arrive_ahead') {
      return lock;
    }
  }
  return 'arrive_ahead';
}

function getStepDistanceFromGps(step, lat, lng) {
  if (Number.isFinite(step?.lat) && Number.isFinite(step?.lng)) {
    return haversineMeters(lat, lng, step.lat, step.lng);
  }
  return Math.max(0, Number(step?.distanceMeters) || 0);
}

/**
 * Evaluates a single live GPS tick against the active route and returns:
 * `{ nextState, trigger, diagnostics }`.
 */
export function evaluateNavigationTick({
  state,
  route,
  gps,
  destination = null,
  eventTitle = 'lokasi event',
  nowMs = Date.now(),
  engine,
} = {}) {
  if (!engine || typeof engine.infer !== 'function') {
    throw new Error('evaluateNavigationTick requires a valid Vector-Attention engine.');
  }

  const lat = Number(gps?.lat);
  const lng = Number(gps?.lng);
  if (!route || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      nextState: state ? cloneState(state) : createVoiceNavTriggerState(),
      trigger: null,
      diagnostics: { skipped: 'missing_route_or_gps' },
    };
  }

  const sig = computeRouteSignature(route, destination);
  let nextState =
    state && state.routeSignature === sig
      ? cloneState(state)
      : createVoiceNavTriggerState({ routeSignature: sig });

  const mode = String(route.mode || 'foot').toLowerCase();
  const speedMps = Math.max(0, Number(gps?.speed) || 0);
  const speedKmh = gps?.isStationary ? 0 : speedMps * 3.6;
  const trafficState = String(route.trafficLevel || 'FREE').toUpperCase();
  const steps = Array.isArray(route.steps) ? route.steps : [];

  const destLat = Number(destination?.lat ?? steps[steps.length - 1]?.lat);
  const destLng = Number(destination?.lng ?? steps[steps.length - 1]?.lng);
  const distToDest =
    Number.isFinite(destLat) && Number.isFinite(destLng)
      ? haversineMeters(lat, lng, destLat, destLng)
      : Infinity;

  const distToPolyline = computeMinDistanceToRouteMeters(lat, lng, route.segments);
  const elapsedSinceSpeech = nowMs - (nextState.lastSpokenAtMs || 0);

  // ── 1. ARRIVAL TRIGGER (Highest Priority, Preempts Calm Cooldown) ──────────
  if (!nextState.arrivedSpoken && distToDest <= 28) {
    const arriveLock = resolveArrivalLock(steps);
    const decision = engine.infer(
      {
        mode,
        directionLock: arriveLock,
        distanceBucket: 'immediate',
        roadClass: steps[steps.length - 1]?.roadClass || 'lokal',
        trafficState,
        hasRoadName: false,
        speedKmh,
      },
      { eventTitle, distanceMeters: Math.round(distToDest) }
    );
    nextState.arrivedSpoken = true;
    nextState.lastSpokenAtMs = nowMs;
    nextState.consecutiveOffRouteCount = 0;
    return {
      nextState,
      trigger: {
        reason: 'arrival',
        priority: 'urgent',
        stepIndex: Math.max(0, steps.length - 1),
        distanceMeters: Math.round(distToDest),
        distanceBucket: 'immediate',
        decision,
      },
      diagnostics: { distToDest: Math.round(distToDest), distToPolyline },
    };
  }

  if (nextState.arrivedSpoken) {
    return {
      nextState,
      trigger: null,
      diagnostics: { skipped: 'already_arrived', distToDest: Math.round(distToDest) },
    };
  }

  // ── 2. DEPARTURE GREETING (First Tick on New Route) ────────────────────────
  if (!nextState.departSpoken && distToDest > 40) {
    const firstStep = steps[0] || {};
    const firstRoad = firstStep.roadName || steps[1]?.roadName || '';
    const decision = engine.infer(
      {
        mode,
        directionLock: 'depart',
        distanceBucket: 'immediate',
        roadClass: firstStep.roadClass || (mode === 'train' ? 'stasiun' : mode === 'bus' ? 'halte' : 'lokal'),
        trafficState,
        hasRoadName: Boolean(firstRoad),
        speedKmh,
      },
      { roadName: firstRoad, eventTitle, distanceMeters: route.distanceMeters || 0 }
    );
    nextState.departSpoken = true;
    nextState.lastSpokenAtMs = nowMs;
    if (steps[0]?.directionLock === 'depart' && steps.length > 1) {
      nextState.activeStepIndex = 1;
    }
    return {
      nextState,
      trigger: {
        reason: 'depart',
        priority: 'normal',
        stepIndex: 0,
        distanceMeters: Math.round(distToDest),
        distanceBucket: 'immediate',
        decision,
      },
      diagnostics: { distToDest: Math.round(distToDest), distToPolyline },
    };
  }

  // ── 3. DEBOUNCED OFF-ROUTE / REROUTE DETECTOR ──────────────────────────────
  const offRouteLimit = OFF_ROUTE_TOLERANCE_BY_MODE[mode] || 55;
  if (distToPolyline !== null && distToPolyline > offRouteLimit) {
    nextState.consecutiveOffRouteCount += 1;
    const isSevereDeviation = distToPolyline > offRouteLimit * 2.2;
    const rerouteReady = nowMs - (nextState.lastRerouteAlertAtMs || 0) >= TRIGGER_COOLDOWNS_MS.rerouteAlertMs;
    if ((nextState.consecutiveOffRouteCount >= 2 || isSevereDeviation) && rerouteReady) {
      const decision = engine.infer(
        {
          mode,
          directionLock: 'reroute',
          distanceBucket: 'immediate',
          roadClass: 'lokal',
          trafficState,
          hasRoadName: false,
          speedKmh,
        },
        { eventTitle }
      );
      nextState.lastRerouteAlertAtMs = nowMs;
      nextState.lastSpokenAtMs = nowMs;
      return {
        nextState,
        trigger: {
          reason: 'off_route',
          priority: 'urgent',
          stepIndex: nextState.activeStepIndex,
          distanceMeters: Math.round(distToPolyline),
          distanceBucket: 'immediate',
          decision,
        },
        diagnostics: {
          offRoute: true,
          distToPolyline,
          offRouteLimit,
          consecutiveOffRouteCount: nextState.consecutiveOffRouteCount,
        },
      };
    }
  } else {
    nextState.consecutiveOffRouteCount = 0;
  }

  // ── 4. MONOTONIC STEP PROGRESSION & MANEUVER DISTANCE CASCADE ──────────────
  let stepIdx = Math.max(0, Math.min(steps.length - 1, nextState.activeStepIndex));
  while (stepIdx < steps.length - 1 && steps[stepIdx]?.directionLock === 'depart') {
    stepIdx += 1;
  }

  // Advance cursor monotonically once user completes or moves past current maneuver waypoint
  while (stepIdx < steps.length - 1) {
    const curStep = steps[stepIdx];
    const nxtStep = steps[stepIdx + 1];
    const dCur = getStepDistanceFromGps(curStep, lat, lng);
    const dNxt = getStepDistanceFromGps(nxtStep, lat, lng);
    const stages = nextState.spokenStepStages[stepIdx] || {};
    const curDoneNow = Boolean(stages.now_25m || stages.immediate);
    const curApproached = Boolean(curDoneNow || stages.imminent_80m);
    const minPrev = Number.isFinite(nextState.lastStepDistanceMeters)
      ? nextState.lastStepDistanceMeters
      : dCur;
    const stepSpan =
      Number.isFinite(curStep?.lat) && Number.isFinite(nxtStep?.lat)
        ? haversineMeters(curStep.lat, curStep.lng, nxtStep.lat, nxtStep.lng)
        : Infinity;

    const movingAwayAfterNow = curDoneNow && dCur > minPrev + 12 && dCur > 22;
    const movingAwayAfterImminent = curApproached && minPrev <= 60 && dCur > minPrev + 18 && dNxt < stepSpan;
    const closerToNext = curApproached && dCur > 25 && dNxt < dCur;

    if (movingAwayAfterNow || movingAwayAfterImminent || closerToNext) {
      stepIdx += 1;
      nextState.lastStepDistanceMeters = Infinity;
    } else {
      break;
    }
  }

  nextState.activeStepIndex = stepIdx;
  const activeStep = steps[stepIdx] || null;

  if (activeStep && !String(activeStep.directionLock || '').startsWith('arrive_')) {
    const distToStep = getStepDistanceFromGps(activeStep, lat, lng);
    nextState.lastStepDistanceMeters = Math.min(nextState.lastStepDistanceMeters, distToStep);

    // 4a. Pulau Jawa Railway Level Crossing Hazard Alert
    if (
      activeStep.roadClass === 'perlintasan_ka' &&
      distToStep <= 200 &&
      nextState.lastHazardStepIndex !== stepIdx &&
      elapsedSinceSpeech >= TRIGGER_COOLDOWNS_MS.urgentPreemptFloorMs
    ) {
      const decision = engine.infer(
        {
          mode,
          directionLock: 'hazard',
          distanceBucket: 'approach_200m',
          roadClass: 'perlintasan_ka',
          trafficState,
          hasRoadName: false,
          speedKmh,
        },
        { distanceMeters: Math.round(distToStep), roadName: activeStep.roadName }
      );
      nextState.lastHazardStepIndex = stepIdx;
      nextState.lastSpokenAtMs = nowMs;
      return {
        nextState,
        trigger: {
          reason: 'hazard_rail_crossing',
          priority: 'urgent',
          stepIndex: stepIdx,
          distanceMeters: Math.round(distToStep),
          distanceBucket: 'approach_200m',
          decision,
        },
        diagnostics: { activeStepIndex: stepIdx, distToStep: Math.round(distToStep), distToPolyline },
      };
    }

    const bucket = bucketizeDistanceMeters(distToStep, { mode, speedKmh });
    const stageMap = nextState.spokenStepStages[stepIdx] || {};
    const alreadySpokenStage = Boolean(stageMap[bucket]);
    const allowedStage = isStageAllowedForContext(bucket, activeStep, mode, speedKmh);
    const urgent = isUrgentBucket(bucket, activeStep.directionLock);
    const cooldownRequired = urgent
      ? TRIGGER_COOLDOWNS_MS.urgentPreemptFloorMs
      : TRIGGER_COOLDOWNS_MS.normalSpeechMs;

    if (!alreadySpokenStage && allowedStage && elapsedSinceSpeech >= cooldownRequired) {
      const decision = engine.infer(
        {
          mode,
          directionLock: activeStep.directionLock,
          distanceBucket: bucket,
          distanceMeters: distToStep,
          roadClass: activeStep.roadClass || 'lokal',
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

      nextState.spokenStepStages[stepIdx] = {
        ...stageMap,
        [bucket]: true,
      };
      nextState.lastSpokenAtMs = nowMs;

      return {
        nextState,
        trigger: {
          reason: 'maneuver',
          priority: urgent ? 'urgent' : 'normal',
          stepIndex: stepIdx,
          distanceMeters: Math.round(distToStep),
          distanceBucket: bucket,
          decision,
        },
        diagnostics: {
          activeStepIndex: stepIdx,
          distToStep: Math.round(distToStep),
          distToPolyline,
          speedKmh: Number(speedKmh.toFixed(1)),
        },
      };
    }
  }

  // ── 5. LIVE TOMTOM TRAFFIC CONGESTION ALERT (Low-Noise, 90s Cooldown) ─────
  const delaySec = Number(route.trafficDelaySeconds || 0);
  const hasHeavyTraffic = (trafficState === 'JAM' || trafficState === 'SLOW') && delaySec >= 120;
  const trafficCooldownOk = nowMs - (nextState.lastTrafficAlertAtMs || 0) >= TRIGGER_COOLDOWNS_MS.trafficAlertMs;
  if (
    hasHeavyTraffic &&
    mode !== 'foot' &&
    mode !== 'train' &&
    trafficCooldownOk &&
    elapsedSinceSpeech >= TRIGGER_COOLDOWNS_MS.normalSpeechMs + 1000
  ) {
    const roadForAlert = activeStep?.roadName || steps[stepIdx]?.roadName || '';
    const delayMin = Math.max(2, Math.round(delaySec / 60));
    const decision = engine.infer(
      {
        mode,
        directionLock: 'traffic',
        distanceBucket: 'prepare_500m',
        roadClass: activeStep?.roadClass || 'arteri',
        trafficState,
        hasRoadName: Boolean(roadForAlert),
        speedKmh,
      },
      { roadName: roadForAlert, delayMin }
    );
    nextState.lastTrafficAlertAtMs = nowMs;
    nextState.lastSpokenAtMs = nowMs;
    return {
      nextState,
      trigger: {
        reason: 'traffic_ahead',
        priority: 'advisory',
        stepIndex: stepIdx,
        distanceMeters: Math.round(Number(route.distanceMeters || 0)),
        distanceBucket: 'prepare_500m',
        decision,
      },
      diagnostics: { trafficState, delayMin, distToPolyline },
    };
  }

  return {
    nextState,
    trigger: null,
    diagnostics: {
      activeStepIndex: stepIdx,
      distToDest: Number.isFinite(distToDest) ? Math.round(distToDest) : null,
      distToPolyline,
      speedKmh: Number(speedKmh.toFixed(1)),
    },
  };
}
