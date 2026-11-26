/**
 * Free Multimodal Transit Routing Engine (Train & Bus) for Java / Indonesia.
 * Tier 1: Free MOTIS / Transitous API (`https://api.transitous.org/api/v1/plan` — OSM + GTFS)
 * Tier 2: Free OSM Overpass API real station/halte snapping + OSRM dotted walk transfers
 * Tier 3: Deterministic multimodal corridor fallback (guaranteed dotted walk + solid transit + stops)
 */

import { extractStepsFromTransitSegments } from './voiceNav/routeStepExtractor.js';

const TRANSITOUS_BASE = (process.env.TRANSITOUS_BASE_URL || 'https://api.transitous.org').replace(/\/+$/, '');
const OVERPASS_URL = process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';
const STATION_CACHE = new Map();
const STATION_CACHE_TTL_MS = 10 * 60 * 1000;

export function decodeEncodedPolyline(encoded, precision = 5) {
  if (!encoded || typeof encoded !== 'string') return [];
  const factor = Math.pow(10, precision);
  const coords = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    coords.push([Number((lat / factor).toFixed(6)), Number((lng / factor).toFixed(6))]);
  }
  return coords;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function queryTransitousItinerary({ fromLat, fromLng, toLat, toLng, mode }) {
  const transitModes =
    mode === 'train' ? 'RAIL,SUBWAY,TRAM,REGIONAL_RAIL,COMMUTER_RAIL' : 'BUS';
  const params = new URLSearchParams({
    fromPlace: `${fromLat},${fromLng}`,
    toPlace: `${toLat},${toLng}`,
    transitModes,
    numItineraries: '1',
    pedestrianProfile: 'FOOT',
  });
  const url = `${TRANSITOUS_BASE}/api/v1/plan?${params.toString()}`;
  const data = await fetchJsonWithTimeout(
    url,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KalceriaMapBlend/1.0 (https://kalceria.id)',
      },
    },
    4200
  );

  const itin = Array.isArray(data?.itineraries) ? data.itineraries[0] : null;
  if (!itin || !Array.isArray(itin.legs) || itin.legs.length === 0) return null;

  const segments = [];
  const stops = [];
  let totalDistance = 0;

  for (const leg of itin.legs) {
    const legMode = String(leg.mode || 'WALK').toUpperCase();
    const isWalk = legMode === 'WALK' || legMode === 'FOOT';
    const rawPoly = leg?.legGeometry?.points;
    const prec = Number(leg?.legGeometry?.precision) || 7;
    let pts = rawPoly ? decodeEncodedPolyline(rawPoly, prec) : [];
    // MOTIS v1 uses precision 7 or 6; sanity-check lat bounds (-90..90)
    if (pts.length > 0 && (Math.abs(pts[0][0]) > 90 || Math.abs(pts[0][1]) > 180)) {
      pts = decodeEncodedPolyline(rawPoly, 6);
    }
    if (pts.length > 0 && (Math.abs(pts[0][0]) > 90 || Math.abs(pts[0][1]) > 180)) {
      pts = decodeEncodedPolyline(rawPoly, 5);
    }
    if (pts.length < 2 && leg.from && leg.to) {
      pts = [
        [Number(leg.from.lat), Number(leg.from.lon)],
        [Number(leg.to.lat), Number(leg.to.lon)],
      ];
    }

    totalDistance += Number(leg.distance || 0);
    const kind = isWalk ? 'walk' : mode === 'train' ? 'train' : 'bus';
    const color = isWalk ? '#64748b' : mode === 'train' ? '#8b5cf6' : '#0ea5e9';
    const lineName = leg.routeShortName || leg.routeLongName || (mode === 'train' ? 'Rail' : 'Bus');

    segments.push({
      kind,
      dashed: isWalk,
      traffic: 'FREE',
      color,
      label: isWalk ? 'Jalan Kaki' : String(lineName),
      points: pts,
    });

    if (!isWalk) {
      if (leg.from?.lat && leg.from?.lon) {
        stops.push({
          name: leg.from.name || (mode === 'train' ? 'Stasiun Asal' : 'Halte Asal'),
          lat: Number(leg.from.lat),
          lng: Number(leg.from.lon),
          kind,
          role: 'board',
        });
      }
      if (Array.isArray(leg.intermediateStops)) {
        for (const st of leg.intermediateStops.slice(0, 12)) {
          if (st?.lat && st?.lon) {
            stops.push({
              name: st.name || 'Transit Stop',
              lat: Number(st.lat),
              lng: Number(st.lon),
              kind,
              role: 'intermediate',
            });
          }
        }
      }
      if (leg.to?.lat && leg.to?.lon) {
        stops.push({
          name: leg.to.name || (mode === 'train' ? 'Stasiun Tujuan' : 'Halte Tujuan'),
          lat: Number(leg.to.lat),
          lng: Number(leg.to.lon),
          kind,
          role: 'alight',
        });
      }
    }
  }

  return {
    provider: 'transitous-motis',
    mode,
    distanceMeters: Math.round(totalDistance),
    durationSeconds: Math.max(60, Math.round(Number(itin.duration || 0))),
    trafficDelaySeconds: 0,
    trafficLevel: 'FREE',
    segments,
    stops,
    steps: extractStepsFromTransitSegments(segments, stops, mode),
    summary: segments
      .map((s) => s.label)
      .filter((v, i, arr) => i === 0 || arr[i - 1] !== v)
      .join(' → '),
  };
}

async function findNearestOsmStop(lat, lng, mode, haversineMeters) {
  const cacheKey = `${mode}:${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = STATION_CACHE.get(cacheKey);
  if (cached && cached.expAt > Date.now()) return cached.stop;

  const radius = mode === 'train' ? 4500 : 1800;
  const filter =
    mode === 'train'
      ? `node["railway"~"^(station|halt|subway_entrance)$"](around:${radius},${lat},${lng});`
      : `node["highway"="bus_stop"](around:${radius},${lat},${lng});node["amenity"="bus_station"](around:${radius},${lat},${lng});`;
  const query = `[out:json][timeout:4];(${filter});out body 12;`;

  const data = await fetchJsonWithTimeout(
    OVERPASS_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    },
    3800
  );

  let best = null;
  let bestDist = Infinity;
  for (const el of data?.elements || []) {
    if (!Number.isFinite(el?.lat) || !Number.isFinite(el?.lon)) continue;
    const d = haversineMeters(lat, lng, el.lat, el.lon);
    if (d < bestDist) {
      bestDist = d;
      best = {
        name: el.tags?.name || (mode === 'train' ? 'Stasiun Terdekat' : 'Halte Bus Terdekat'),
        lat: Number(el.lat),
        lng: Number(el.lon),
      };
    }
  }

  STATION_CACHE.set(cacheKey, { stop: best, expAt: Date.now() + STATION_CACHE_TTL_MS });
  if (STATION_CACHE.size > 400) {
    const firstKey = STATION_CACHE.keys().next().value;
    if (firstKey !== undefined) STATION_CACHE.delete(firstKey);
  }
  return best;
}

export async function computeFreeMultimodalTransitRoute({
  fromLat,
  fromLng,
  toLat,
  toLng,
  mode,
  fetchOsrmLeg,
  haversineMeters,
}) {
  // Tier 1: Real open-source MOTIS / Transitous multimodal transit routing
  const motisRoute = await queryTransitousItinerary({ fromLat, fromLng, toLat, toLng, mode });
  if (motisRoute && motisRoute.segments.length > 0) {
    return motisRoute;
  }

  // Tier 2: Real OSM Overpass nearest stations/haltes + OSRM dotted walk transfers + corridor
  const [originStop, destStop] = await Promise.all([
    findNearestOsmStop(fromLat, fromLng, mode, haversineMeters),
    findNearestOsmStop(toLat, toLng, mode, haversineMeters),
  ]);

  const transitColor = mode === 'train' ? '#8b5cf6' : '#0ea5e9';
  const transitLabel = mode === 'train' ? 'Kereta / KRL' : 'Bus / Trans';
  const cruiseMps = mode === 'train' ? 11.5 : 6.8; // Realistic Java urban rail ~41km/h, bus ~24km/h
  const waitBufferSec = mode === 'train' ? 300 : 240;

  if (
    originStop &&
    destStop &&
    haversineMeters(originStop.lat, originStop.lng, destStop.lat, destStop.lng) > 250
  ) {
    const [walkIn, transitLeg, walkOut] = await Promise.all([
      fetchOsrmLeg(fromLat, fromLng, originStop.lat, originStop.lng, 'foot'),
      fetchOsrmLeg(originStop.lat, originStop.lng, destStop.lat, destStop.lng, 'car'),
      fetchOsrmLeg(destStop.lat, destStop.lng, toLat, toLng, 'foot'),
    ]);

    const walkInPts = walkIn?.points?.length >= 2 ? walkIn.points : [[fromLat, fromLng], [originStop.lat, originStop.lng]];
    const walkOutPts = walkOut?.points?.length >= 2 ? walkOut.points : [[destStop.lat, destStop.lng], [toLat, toLng]];
    const transitPts =
      mode === 'bus' && transitLeg?.points?.length >= 2
        ? transitLeg.points
        : [[originStop.lat, originStop.lng], [destStop.lat, destStop.lng]];

    const dWalkIn = walkIn?.distanceMeters || haversineMeters(fromLat, fromLng, originStop.lat, originStop.lng);
    const dTransit = transitLeg?.distanceMeters || haversineMeters(originStop.lat, originStop.lng, destStop.lat, destStop.lng);
    const dWalkOut = walkOut?.distanceMeters || haversineMeters(destStop.lat, destStop.lng, toLat, toLng);

    const durSeconds = Math.round(dWalkIn / 1.32 + dTransit / cruiseMps + dWalkOut / 1.32 + waitBufferSec);

    const segments = [
      { kind: 'walk', dashed: true, traffic: 'FREE', color: '#64748b', label: 'Jalan Kaki', points: walkInPts },
      { kind: mode, dashed: false, traffic: 'FREE', color: transitColor, label: transitLabel, points: transitPts },
      { kind: 'walk', dashed: true, traffic: 'FREE', color: '#64748b', label: 'Jalan Kaki', points: walkOutPts },
    ];
    const stops = [
      { name: originStop.name, lat: originStop.lat, lng: originStop.lng, kind: mode, role: 'board' },
      { name: destStop.name, lat: destStop.lat, lng: destStop.lng, kind: mode, role: 'alight' },
    ];

    return {
      provider: 'overpass-osrm-multimodal',
      mode,
      distanceMeters: Math.round(dWalkIn + dTransit + dWalkOut),
      durationSeconds: Math.max(120, durSeconds),
      trafficDelaySeconds: 0,
      trafficLevel: 'FREE',
      segments,
      stops,
      steps: extractStepsFromTransitSegments(segments, stops, mode),
      summary: `Jalan → ${originStop.name} (${transitLabel}) → ${destStop.name} → Jalan`,
    };
  }

  // Tier 3: Resilient multimodal fallback (always shows dotted walk ends + solid transit core)
  const coreLeg = await fetchOsrmLeg(fromLat, fromLng, toLat, toLng, 'car');
  const fullPts = coreLeg?.points?.length >= 4
    ? coreLeg.points
    : [
        [fromLat, fromLng],
        [fromLat + (toLat - fromLat) * 0.15, fromLng + (toLng - fromLng) * 0.15],
        [fromLat + (toLat - fromLat) * 0.85, fromLng + (toLng - fromLng) * 0.85],
        [toLat, toLng],
      ];

  const iStart = Math.max(1, Math.floor(fullPts.length * 0.12));
  const iEnd = Math.max(iStart + 1, Math.floor(fullPts.length * 0.88));
  const dist = coreLeg?.distanceMeters || haversineMeters(fromLat, fromLng, toLat, toLng);
  const durSeconds = Math.max(120, Math.round(dist / cruiseMps + waitBufferSec));

  const segments = [
    { kind: 'walk', dashed: true, traffic: 'FREE', color: '#64748b', label: 'Jalan Kaki', points: fullPts.slice(0, iStart + 1) },
    { kind: mode, dashed: false, traffic: 'FREE', color: transitColor, label: transitLabel, points: fullPts.slice(iStart, iEnd + 1) },
    { kind: 'walk', dashed: true, traffic: 'FREE', color: '#64748b', label: 'Jalan Kaki', points: fullPts.slice(iEnd) },
  ];
  const stops = [
    { name: mode === 'train' ? 'Stasiun Naik' : 'Halte Naik', lat: fullPts[iStart][0], lng: fullPts[iStart][1], kind: mode, role: 'board' },
    { name: mode === 'train' ? 'Stasiun Turun' : 'Halte Turun', lat: fullPts[iEnd][0], lng: fullPts[iEnd][1], kind: mode, role: 'alight' },
  ];

  return {
    provider: 'multimodal-corridor-fallback',
    mode,
    distanceMeters: Math.round(dist),
    durationSeconds: durSeconds,
    trafficDelaySeconds: 0,
    trafficLevel: 'FREE',
    segments,
    stops,
    steps: extractStepsFromTransitSegments(segments, stops, mode),
    summary: `Jalan → ${transitLabel} → Jalan`,
  };
}

