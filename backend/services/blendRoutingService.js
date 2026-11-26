/**
 * Hybrid Multi-Engine Routing & Live Traffic Service for Group Location Blend.
 *
 * Combines:
 * 1. Pulau Jawa OSRM Stack (`OSRM_FOOT_URL`, `OSRM_MOTO_URL`, `OSRM_CAR_URL` + public OSRM fallback)
 * 2. TomTom Routing API v1 with Live Traffic Congestion Sections (`TOMTOM_API_KEY`)
 * 3. Free Multimodal Public Transit Stack (`blendTransitService.js` — Transitous MOTIS + OSM Overpass)
 */

import { computeFreeMultimodalTransitRoute } from './blendTransitService.js';
import {
  extractStepsFromOsrmLeg,
  extractStepsFromTomTomGuidance,
} from './voiceNav/routeStepExtractor.js';

export const BLEND_MODES = Object.freeze(['foot', 'motorcycle', 'car', 'bus', 'train']);

const ROUTE_CACHE = new Map();
const ROUTE_CACHE_TTL_MS = 15 * 1000;
const ROUTE_CACHE_MAX = 600;

export function normalizeBlendMode(mode) {
  const m = String(mode || 'foot').trim().toLowerCase();
  return BLEND_MODES.includes(m) ? m : 'foot';
}

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatEtaHoursMinutes(durationSeconds) {
  const safeSec = Math.max(0, Math.round(Number(durationSeconds) || 0));
  if (safeSec < 60) {
    return { hours: 0, minutes: 0, totalMinutes: 0, label: '< 1 mnt' };
  }
  const totalMinutes = Math.round(safeSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let label;
  if (hours > 0 && minutes > 0) label = `${hours} jam ${minutes} mnt`;
  else if (hours > 0) label = `${hours} jam`;
  else label = `${minutes} mnt`;
  return { hours, minutes, totalMinutes, label };
}

export function classifyTrafficCongestion({ magnitudeOfDelay = 0, delayRatio = 0 } = {}) {
  const mag = Number(magnitudeOfDelay) || 0;
  const ratio = Number(delayRatio) || 0;
  if (mag >= 3 || ratio >= 0.45) return 'JAM';
  if (mag === 2 || ratio >= 0.22) return 'SLOW';
  if (mag === 1 || ratio >= 0.1) return 'MODERATE';
  return 'FREE';
}

export function trafficColorForLevel(level) {
  switch (level) {
    case 'JAM':
      return '#ef4444'; // Crimson red — macet berat
    case 'SLOW':
      return '#f97316'; // Orange — perlambatan signifikan
    case 'MODERATE':
      return '#eab308'; // Amber — padat merayap
    default:
      return '#10b981'; // Emerald green — lancar
  }
}

export function downsampleCoordinates(points, maxPoints = 180) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points || [];
  const step = (points.length - 1) / (maxPoints - 1);
  const out = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(points[Math.round(i * step)]);
  }
  return out;
}

export function buildTrafficSegmentsFromTomTom(allPoints = [], sections = []) {
  if (!Array.isArray(allPoints) || allPoints.length < 2) return [];
  const trafficSections = (sections || [])
    .filter((s) => String(s?.sectionType || '').toUpperCase() === 'TRAFFIC')
    .sort((a, b) => Number(a.startPointIndex || 0) - Number(b.startPointIndex || 0));

  if (trafficSections.length === 0) {
    return [
      {
        kind: 'road',
        dashed: false,
        traffic: 'FREE',
        color: trafficColorForLevel('FREE'),
        label: 'Lancar',
        points: downsampleCoordinates(allPoints, 180),
      },
    ];
  }

  const segments = [];
  let cursor = 0;
  const lastIdx = allPoints.length - 1;

  for (const sec of trafficSections) {
    const start = Math.max(cursor, Math.min(lastIdx, Number(sec.startPointIndex || 0)));
    const end = Math.max(start, Math.min(lastIdx, Number(sec.endPointIndex || start)));

    if (start > cursor) {
      segments.push({
        kind: 'road',
        dashed: false,
        traffic: 'FREE',
        color: trafficColorForLevel('FREE'),
        label: 'Lancar',
        points: downsampleCoordinates(allPoints.slice(cursor, start + 1), 60),
      });
    }

    if (end > start) {
      const level = classifyTrafficCongestion({
        magnitudeOfDelay: sec.magnitudeOfDelay,
        delayRatio: sec.simpleCategory === 'JAM' ? 0.6 : sec.simpleCategory === 'ROAD_CLOSED' ? 0.9 : 0.25,
      });
      segments.push({
        kind: 'road',
        dashed: false,
        traffic: level,
        color: trafficColorForLevel(level),
        label: level === 'JAM' ? 'Macet' : level === 'SLOW' ? 'Lambat' : level === 'MODERATE' ? 'Padat' : 'Lancar',
        points: downsampleCoordinates(allPoints.slice(start, end + 1), 60),
      });
    }
    cursor = Math.max(cursor, end);
  }

  if (cursor < lastIdx) {
    segments.push({
      kind: 'road',
      dashed: false,
      traffic: 'FREE',
      color: trafficColorForLevel('FREE'),
      label: 'Lancar',
      points: downsampleCoordinates(allPoints.slice(cursor), 60),
    });
  }

  return segments.filter((s) => s.points.length >= 2);
}

async function fetchJson(url, timeoutMs = 4200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'KalceriaMapBlend/1.0' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTomTomRoute(fromLat, fromLng, toLat, toLng, mode) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return null;

  const travelMode =
    mode === 'foot' ? 'pedestrian' : mode === 'motorcycle' ? 'motorcycle' : 'car';
  const params = new URLSearchParams({
    key: apiKey,
    travelMode,
    traffic: mode === 'foot' ? 'false' : 'true',
    sectionType: 'traffic',
    computeTravelTimeFor: 'all',
    routeType: 'fastest',
    instructionsType: 'coded',
    avoid: mode === 'motorcycle' ? 'tollRoads' : '',
  });
  if (mode !== 'motorcycle') params.delete('avoid');

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLng}:${toLat},${toLng}/json?${params.toString()}`;
  const data = await fetchJson(url, 4500);
  const route = Array.isArray(data?.routes) ? data.routes[0] : null;
  const leg = route?.legs?.[0];
  if (!route || !leg || !Array.isArray(leg.points) || leg.points.length < 2) return null;

  const allPoints = leg.points.map((p) => [Number(p.latitude.toFixed(6)), Number(p.longitude.toFixed(6))]);
  const summary = route.summary || {};
  const durationSeconds = Math.max(30, Math.round(Number(summary.travelTimeInSeconds || 0)));
  const distanceMeters = Math.max(1, Math.round(Number(summary.lengthInMeters || 0)));
  const trafficDelaySeconds = Math.max(0, Math.round(Number(summary.trafficDelayInSeconds || 0)));
  const noTraffic = Math.max(1, Number(summary.noTrafficTravelTimeInSeconds || durationSeconds));
  const delayRatio = trafficDelaySeconds / noTraffic;
  const trafficLevel = mode === 'foot' ? 'FREE' : classifyTrafficCongestion({ delayRatio });

  const segments =
    mode === 'foot'
      ? [
          {
            kind: 'walk',
            dashed: true,
            traffic: 'FREE',
            color: '#38bdf8',
            label: 'Jalan Kaki',
            points: downsampleCoordinates(allPoints, 180),
          },
        ]
      : buildTrafficSegmentsFromTomTom(allPoints, route.sections || []);

  return {
    provider: 'tomtom-traffic-v1',
    mode,
    distanceMeters,
    durationSeconds,
    trafficDelaySeconds,
    trafficLevel,
    segments,
    stops: [],
    steps: extractStepsFromTomTomGuidance(route.guidance, mode),
    summary:
      trafficDelaySeconds >= 120
        ? `+${Math.round(trafficDelaySeconds / 60)} mnt macet`
        : mode === 'foot'
        ? 'Rute jalan kaki'
        : 'Lalu lintas lancar',
  };
}

export async function fetchOsrmLeg(fromLat, fromLng, toLat, toLng, mode = 'foot') {
  const candidates = [];
  if (mode === 'foot') {
    if (process.env.OSRM_FOOT_URL) {
      candidates.push(`${process.env.OSRM_FOOT_URL.replace(/\/+$/, '')}/route/v1/foot`);
    }
    candidates.push('https://routing.openstreetmap.de/routed-foot/route/v1/foot');
    candidates.push('https://router.project-osrm.org/route/v1/foot');
  } else if (mode === 'motorcycle') {
    if (process.env.OSRM_MOTO_URL) {
      candidates.push(`${process.env.OSRM_MOTO_URL.replace(/\/+$/, '')}/route/v1/driving`);
    }
    candidates.push('https://routing.openstreetmap.de/routed-car/route/v1/driving');
    candidates.push('https://router.project-osrm.org/route/v1/driving');
  } else {
    if (process.env.OSRM_CAR_URL) {
      candidates.push(`${process.env.OSRM_CAR_URL.replace(/\/+$/, '')}/route/v1/driving`);
    }
    candidates.push('https://routing.openstreetmap.de/routed-car/route/v1/driving');
    candidates.push('https://router.project-osrm.org/route/v1/driving');
  }

  for (const base of candidates) {
    const url = `${base}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
    const data = await fetchJson(url, 3800);
    const route = Array.isArray(data?.routes) ? data.routes[0] : null;
    const coords = route?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const points = downsampleCoordinates(
        coords.map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]),
        180
      );
      const distanceMeters = Math.round(Number(route.distance || 0));
      let durationSeconds = Math.round(Number(route.duration || 0));
      // Calibrate motorcycle speed when falling back to public car OSRM
      if (mode === 'motorcycle' && !process.env.OSRM_MOTO_URL) {
        durationSeconds = Math.round(durationSeconds * 0.88);
      }
      return {
        provider: base.includes('openstreetmap') || base.includes('project-osrm') ? 'osrm-public' : 'osrm-java-docker',
        mode,
        distanceMeters,
        durationSeconds: Math.max(30, durationSeconds),
        points,
        steps: extractStepsFromOsrmLeg(route.legs?.[0], mode),
      };
    }
  }
  return null;
}

export async function computeBlendRoute({ fromLat, fromLng, toLat, toLng, mode = 'foot' }) {
  const safeMode = normalizeBlendMode(mode);
  const fLat = Number(fromLat);
  const fLng = Number(fromLng);
  const tLat = Number(toLat);
  const tLng = Number(toLng);

  if (![fLat, fLng, tLat, tLng].every(Number.isFinite)) {
    return null;
  }

  const straightDist = haversineMeters(fLat, fLng, tLat, tLng);
  if (straightDist < 20) {
    return {
      provider: 'arrived',
      mode: safeMode,
      distanceMeters: Math.round(straightDist),
      durationSeconds: 0,
      eta: { hours: 0, minutes: 0, totalMinutes: 0, label: 'Tiba' },
      trafficDelaySeconds: 0,
      trafficLevel: 'FREE',
      segments: [
        { kind: 'walk', dashed: true, traffic: 'FREE', color: '#10b981', label: 'Tiba', points: [[fLat, fLng], [tLat, tLng]] },
      ],
      stops: [],
      steps: [
        {
          index: 0,
          maneuverType: 'arrive',
          modifier: 'straight',
          directionLock: 'arrive_ahead',
          roadName: '',
          spokenRoadName: '',
          roadClass: 'lokal',
          exitNumber: null,
          distanceMeters: Math.round(straightDist),
          durationSeconds: 0,
          lat: tLat,
          lng: tLng,
          hasChainedNext: false,
          isEndOfRoad: false,
          isNewRoadName: false,
        },
      ],
      summary: 'Sudah tiba di lokasi event',
    };
  }

  const cacheKey = `${safeMode}:${fLat.toFixed(4)},${fLng.toFixed(4)}->${tLat.toFixed(4)},${tLng.toFixed(4)}`;
  const cached = ROUTE_CACHE.get(cacheKey);
  if (cached && cached.expAt > Date.now()) {
    return cached.value;
  }

  let route = null;

  if (safeMode === 'train' || safeMode === 'bus') {
    route = await computeFreeMultimodalTransitRoute({
      fromLat: fLat,
      fromLng: fLng,
      toLat: tLat,
      toLng: tLng,
      mode: safeMode,
      fetchOsrmLeg,
      haversineMeters,
    });
  } else {
    // Prefer TomTom live-traffic routing for car/motorcycle when API key is configured,
    // and prefer Java OSRM for default foot (with TomTom fallback & traffic enrichment!).
    if (safeMode !== 'foot' && process.env.TOMTOM_API_KEY) {
      route = await fetchTomTomRoute(fLat, fLng, tLat, tLng, safeMode);
    }

    if (!route) {
      const osrm = await fetchOsrmLeg(fLat, fLng, tLat, tLng, safeMode);
      if (osrm) {
        route = {
          provider: osrm.provider,
          mode: safeMode,
          distanceMeters: osrm.distanceMeters,
          durationSeconds: osrm.durationSeconds,
          trafficDelaySeconds: 0,
          trafficLevel: 'FREE',
          segments: [
            {
              kind: safeMode === 'foot' ? 'walk' : 'road',
              dashed: safeMode === 'foot',
              traffic: 'FREE',
              color: safeMode === 'foot' ? '#38bdf8' : trafficColorForLevel('FREE'),
              label: safeMode === 'foot' ? 'Jalan Kaki' : 'Lancar',
              points: osrm.points,
            },
          ],
          stops: [],
          steps: Array.isArray(osrm.steps) ? osrm.steps : [],
          summary: safeMode === 'foot' ? 'Rute OSRM jalan kaki' : 'Rute OSRM Pulau Jawa',
        };
      }
    }

    if (!route && process.env.TOMTOM_API_KEY) {
      route = await fetchTomTomRoute(fLat, fLng, tLat, tLng, safeMode);
    }

    if (!route) {
      const fallbackSpeedMps = safeMode === 'foot' ? 1.35 : safeMode === 'motorcycle' ? 9.5 : 8.2;
      route = {
        provider: 'direct-fallback',
        mode: safeMode,
        distanceMeters: Math.round(straightDist * 1.25),
        durationSeconds: Math.max(60, Math.round((straightDist * 1.25) / fallbackSpeedMps)),
        trafficDelaySeconds: 0,
        trafficLevel: 'FREE',
        segments: [
          {
            kind: safeMode === 'foot' ? 'walk' : 'road',
            dashed: safeMode === 'foot',
            traffic: 'FREE',
            color: '#38bdf8',
            label: 'Estimasi rute',
            points: [[fLat, fLng], [tLat, tLng]],
          },
        ],
        stops: [],
        steps: [
          {
            index: 0,
            maneuverType: 'depart',
            modifier: 'straight',
            directionLock: 'depart',
            roadName: '',
            spokenRoadName: '',
            roadClass: 'lokal',
            exitNumber: null,
            distanceMeters: Math.round(straightDist * 1.25),
            durationSeconds: Math.max(60, Math.round((straightDist * 1.25) / fallbackSpeedMps)),
            lat: fLat,
            lng: fLng,
            hasChainedNext: false,
            isEndOfRoad: false,
            isNewRoadName: false,
          },
          {
            index: 1,
            maneuverType: 'arrive',
            modifier: 'straight',
            directionLock: 'arrive_ahead',
            roadName: '',
            spokenRoadName: '',
            roadClass: 'lokal',
            exitNumber: null,
            distanceMeters: 0,
            durationSeconds: 0,
            lat: tLat,
            lng: tLng,
            hasChainedNext: false,
            isEndOfRoad: false,
            isNewRoadName: false,
          },
        ],
        summary: 'Estimasi jalur langsung',
      };
    }
  }

  const enriched = {
    ...route,
    eta: formatEtaHoursMinutes(route.durationSeconds),
  };

  ROUTE_CACHE.set(cacheKey, { value: enriched, expAt: Date.now() + ROUTE_CACHE_TTL_MS });
  if (ROUTE_CACHE.size > ROUTE_CACHE_MAX) {
    const oldest = ROUTE_CACHE.keys().next().value;
    if (oldest !== undefined) ROUTE_CACHE.delete(oldest);
  }
  return enriched;
}

