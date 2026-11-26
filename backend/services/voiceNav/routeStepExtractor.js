/**
 * Real-Time Road-Ahead Turn-by-Turn Step Extractor (Pure Module).
 *
 * Normalizes raw maneuvers from:
 * 1. OSRM (`steps=true`)
 * 2. TomTom Routing API v1 (`instructionsType=coded`)
 * 3. Transitous / Overpass Multimodal Transit Legs (`bus`, `train`)
 *
 * Outputs canonical `NavStep[]` objects consumed by our Pulau Jawa Vector-Attention Engine.
 */

import { classifyJavaRoadContext, normalizeJavaRoadName } from './javaTextNormalizer.js';

function mapOsrmDirectionLock(type, modifier) {
  const t = String(type || '').toLowerCase();
  const m = String(modifier || '').toLowerCase();

  if (t === 'depart') return 'depart';
  if (t === 'arrive') {
    if (m.includes('left')) return 'arrive_left';
    if (m.includes('right')) return 'arrive_right';
    return 'arrive_ahead';
  }
  if (t === 'roundabout' || t === 'rotary' || t === 'roundabout turn' || t === 'exit roundabout') {
    return 'roundabout';
  }
  if (t === 'on ramp') return 'ramp_enter';
  if (t === 'off ramp') return 'ramp_exit';
  if (t === 'merge') return m.includes('left') ? 'merge_left' : 'merge_right';
  if (t === 'fork') return m.includes('left') ? 'keep_left' : 'keep_right';
  if (m === 'uturn') return 'uturn';
  if (t === 'continue' || t === 'new name') {
    if (m === 'slight left') return 'slight_left';
    if (m === 'slight right') return 'slight_right';
    return 'straight';
  }
  if (m === 'sharp left') return 'sharp_left';
  if (m === 'slight left') return 'slight_left';
  if (m === 'left') return 'left';
  if (m === 'sharp right') return 'sharp_right';
  if (m === 'slight right') return 'slight_right';
  if (m === 'right') return 'right';
  return 'straight';
}

function mapTomTomDirectionLock(maneuver) {
  const m = String(maneuver || '').toUpperCase();
  if (m === 'DEPART') return 'depart';
  if (m === 'ARRIVE_LEFT') return 'arrive_left';
  if (m === 'ARRIVE_RIGHT') return 'arrive_right';
  if (m.startsWith('ARRIVE')) return 'arrive_ahead';
  if (m.includes('ROUNDABOUT')) return 'roundabout';
  if (m.includes('UTURN')) return 'uturn';
  if (m === 'ENTER_MOTORWAY' || m === 'ENTER_HIGHWAY' || m === 'TAKE_RAMP') return 'ramp_enter';
  if (m === 'TAKE_EXIT' || m === 'MOTORWAY_EXIT_LEFT' || m === 'MOTORWAY_EXIT_RIGHT') return 'ramp_exit';
  if (m === 'KEEP_LEFT') return 'keep_left';
  if (m === 'KEEP_RIGHT') return 'keep_right';
  if (m === 'SHARP_LEFT') return 'sharp_left';
  if (m === 'BEAR_LEFT') return 'slight_left';
  if (m === 'TURN_LEFT') return 'left';
  if (m === 'SHARP_RIGHT') return 'sharp_right';
  if (m === 'BEAR_RIGHT') return 'slight_right';
  if (m === 'TURN_RIGHT') return 'right';
  return 'straight';
}

function resolveChainedPair(curLock, nextLock) {
  const isL = (d) => d === 'left' || d === 'slight_left' || d === 'sharp_left';
  const isR = (d) => d === 'right' || d === 'slight_right' || d === 'sharp_right';
  if (isL(curLock) && isR(nextLock)) {
    return { templateHint: 'chain_left_then_right', directionLock: 'chained_lr' };
  }
  if (isR(curLock) && isL(nextLock)) {
    return { templateHint: 'chain_right_then_left', directionLock: 'chained_rl' };
  }
  if (isL(curLock) && isL(nextLock)) {
    return { templateHint: 'chain_left_then_left', directionLock: 'chained_ll' };
  }
  if (isR(curLock) && isR(nextLock)) {
    return { templateHint: 'chain_right_then_right', directionLock: 'chained_rr' };
  }
  return null;
}

export function annotateChainedTurns(steps = []) {
  const list = Array.isArray(steps) ? steps.map((s) => ({ ...s })) : [];
  for (let i = 0; i < list.length - 1; i++) {
    const cur = list[i];
    const next = list[i + 1];
    const isShortGap = Number(cur.distanceMeters || 0) > 0 && Number(cur.distanceMeters || 0) <= 65;
    const chain = isShortGap ? resolveChainedPair(cur.directionLock, next.directionLock) : null;
    if (chain) {
      cur.hasChainedNext = true;
      cur.chainedTemplateHint = chain.templateHint;
      cur.chainedDirectionLock = chain.directionLock;
      cur.nextDirectionLock = next.directionLock;
    } else {
      cur.hasChainedNext = false;
      cur.chainedDirectionLock = null;
    }
  }
  return list;
}

export function extractStepsFromOsrmLeg(osrmLeg, mode = 'foot') {
  const rawSteps = Array.isArray(osrmLeg?.steps) ? osrmLeg.steps : [];
  const extracted = rawSteps.map((st, idx) => {
    const man = st.maneuver || {};
    const manType = String(man.type || 'continue').toLowerCase();
    const loc = Array.isArray(man.location) ? man.location : [null, null]; // [lng, lat]
    const rawRoad = String(st.name || st.ref || '').trim();
    const directionLock = mapOsrmDirectionLock(manType, man.modifier);
    const roadClass = classifyJavaRoadContext({ roadName: rawRoad, mode });
    return {
      index: idx,
      maneuverType: manType,
      modifier: String(man.modifier || 'straight').toLowerCase(),
      directionLock,
      roadName: rawRoad,
      spokenRoadName: normalizeJavaRoadName(rawRoad),
      roadClass,
      exitNumber: Number.isFinite(Number(man.exit)) ? Number(man.exit) : null,
      distanceMeters: Math.max(0, Math.round(Number(st.distance || 0))),
      durationSeconds: Math.max(0, Math.round(Number(st.duration || 0))),
      lat: Number.isFinite(Number(loc[1])) ? Number(Number(loc[1]).toFixed(6)) : null,
      lng: Number.isFinite(Number(loc[0])) ? Number(Number(loc[0]).toFixed(6)) : null,
      hasChainedNext: false,
      isEndOfRoad: manType === 'end of road',
      isNewRoadName: manType === 'new name',
    };
  });
  return annotateChainedTurns(extracted);
}

export function extractStepsFromTomTomGuidance(guidance = null, mode = 'car') {
  const rawList = Array.isArray(guidance?.instructions) ? guidance.instructions : [];
  const extracted = rawList.map((inst, idx) => {
    const rawRoad = String(
      inst.street || (Array.isArray(inst.roadNumbers) ? inst.roadNumbers[0] : '') || ''
    ).trim();
    const manUpper = String(inst.maneuver || 'FOLLOW').toUpperCase();
    const directionLock = mapTomTomDirectionLock(manUpper);
    const roadClass = classifyJavaRoadContext({ roadName: rawRoad, mode });
    const nextInst = rawList[idx + 1];
    const curOffset = Number(inst.routeOffsetInMeters || 0);
    const nextOffset = nextInst ? Number(nextInst.routeOffsetInMeters || curOffset) : curOffset;
    const distMeters = Math.max(0, Math.round(nextOffset - curOffset));

    return {
      index: idx,
      maneuverType: manUpper.toLowerCase(),
      modifier: directionLock,
      directionLock,
      roadName: rawRoad,
      spokenRoadName: normalizeJavaRoadName(rawRoad),
      roadClass,
      exitNumber: Number.isFinite(Number(inst.roundaboutExitNumber))
        ? Number(inst.roundaboutExitNumber)
        : null,
      distanceMeters: distMeters,
      durationSeconds: Math.max(0, Math.round(Number(inst.travelTimeInSeconds || 0))),
      lat: Number.isFinite(Number(inst.point?.latitude))
        ? Number(Number(inst.point.latitude).toFixed(6))
        : null,
      lng: Number.isFinite(Number(inst.point?.longitude))
        ? Number(Number(inst.point.longitude).toFixed(6))
        : null,
      hasChainedNext: Boolean(inst.combineWithNext),
      isEndOfRoad: manUpper.includes('END_OF_ROAD'),
      isNewRoadName: manUpper === 'FOLLOW' && Boolean(rawRoad),
    };
  });
  return annotateChainedTurns(extracted);
}

export function extractStepsFromTransitSegments(segments = [], stops = [], mode = 'train') {
  const steps = [];
  let stopCursor = 0;
  const roadClass = mode === 'train' ? 'stasiun' : 'halte';

  for (let i = 0; i < (segments || []).length; i++) {
    const seg = segments[i];
    const pts = Array.isArray(seg?.points) ? seg.points : [];
    const first = pts[0] || [null, null];
    const last = pts[pts.length - 1] || first;

    if (seg.kind === 'walk') {
      const targetStop = stops[stopCursor] || null;
      steps.push({
        index: steps.length,
        maneuverType: 'transit_walk',
        modifier: 'straight',
        directionLock: i === segments.length - 1 ? 'arrive_ahead' : 'transit_walk',
        roadName: targetStop?.name || seg.label || 'Jalan Kaki',
        spokenRoadName: normalizeJavaRoadName(targetStop?.name || 'pemberhentian berikutnya'),
        stopName: targetStop?.name || null,
        roadClass,
        exitNumber: null,
        distanceMeters: Math.max(40, pts.length * 25),
        durationSeconds: 120,
        lat: Number.isFinite(first[0]) ? first[0] : null,
        lng: Number.isFinite(first[1]) ? first[1] : null,
        hasChainedNext: false,
        chainedDirectionLock: null,
        isEndOfRoad: false,
        isNewRoadName: false,
      });
    } else {
      const boardStop = stops.find((s, idx) => idx >= stopCursor && s.role === 'board') || stops[stopCursor] || null;
      const alightStop =
        stops.find((s, idx) => idx > stopCursor && s.role === 'alight') || stops[stops.length - 1] || null;
      stopCursor = Math.min(stops.length, stopCursor + 2);

      steps.push({
        index: steps.length,
        maneuverType: 'transit_board',
        modifier: 'straight',
        directionLock: 'transit_board',
        roadName: seg.label || (mode === 'train' ? 'Kereta' : 'Bus'),
        spokenRoadName: normalizeJavaRoadName(seg.label || (mode === 'train' ? 'Kereta' : 'Bus')),
        lineName: seg.label || (mode === 'train' ? 'KRL' : 'TransJakarta'),
        stopName: boardStop?.name || (mode === 'train' ? 'Stasiun Asal' : 'Halte Asal'),
        destStopName: alightStop?.name || (mode === 'train' ? 'Stasiun Tujuan' : 'Halte Tujuan'),
        roadClass,
        exitNumber: null,
        distanceMeters: Math.max(250, pts.length * 80),
        durationSeconds: 300,
        lat: Number.isFinite(boardStop?.lat) ? boardStop.lat : first[0],
        lng: Number.isFinite(boardStop?.lng) ? boardStop.lng : first[1],
        hasChainedNext: false,
        chainedDirectionLock: null,
        isEndOfRoad: false,
        isNewRoadName: false,
      });

      steps.push({
        index: steps.length,
        maneuverType: 'transit_alight',
        modifier: 'straight',
        directionLock: 'transit_alight',
        roadName: alightStop?.name || (mode === 'train' ? 'Stasiun Tujuan' : 'Halte Tujuan'),
        spokenRoadName: normalizeJavaRoadName(alightStop?.name || (mode === 'train' ? 'Stasiun Tujuan' : 'Halte Tujuan')),
        stopName: alightStop?.name || (mode === 'train' ? 'Stasiun Tujuan' : 'Halte Tujuan'),
        roadClass,
        exitNumber: null,
        distanceMeters: 200,
        durationSeconds: 60,
        lat: Number.isFinite(alightStop?.lat) ? alightStop.lat : last[0],
        lng: Number.isFinite(alightStop?.lng) ? alightStop.lng : last[1],
        hasChainedNext: false,
        chainedDirectionLock: null,
        isEndOfRoad: false,
        isNewRoadName: false,
      });
    }
  }

  return steps;
}
