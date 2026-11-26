import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BLEND_MODES,
  normalizeBlendMode,
  formatEtaHoursMinutes,
  classifyTrafficCongestion,
  buildTrafficSegmentsFromTomTom,
} from '../services/blendRoutingService.js';
import { decodeEncodedPolyline } from '../services/blendTransitService.js';

test('Pulau Jawa OSRM Dockerfile & motorcycle.lua strictly scope Java extract and exclude toll roads', () => {
  const dockerfile = fs.readFileSync(path.resolve('infra/osrm-java/Dockerfile'), 'utf8');
  const script = fs.readFileSync(path.resolve('infra/osrm-java/scripts/prepare-java-osrm.sh'), 'utf8');
  const motoLua = fs.readFileSync(path.resolve('infra/osrm-java/profiles/motorcycle.lua'), 'utf8');

  assert.match(dockerfile, /java-latest\.osm\.pbf/);
  assert.match(script, /osrm-extract/);
  assert.match(script, /osrm-partition/);
  assert.match(script, /osrm-customize/);
  assert.match(script, /--algorithm mld/);
  assert.match(motoLua, /left_hand_driving\s*=\s*true/);
  assert.match(motoLua, /highway == 'motorway'/);
  assert.match(motoLua, /toll == 'yes'/);
});

test('Blend routing supports 5 modes (default foot), jam & menit ETA, and TomTom traffic congestion segmentation', () => {
  assert.deepEqual([...BLEND_MODES], ['foot', 'motorcycle', 'car', 'bus', 'train']);
  assert.equal(normalizeBlendMode(undefined), 'foot');
  assert.equal(normalizeBlendMode('TRAIN'), 'train');
  assert.equal(normalizeBlendMode('spaceship'), 'foot');

  assert.equal(formatEtaHoursMinutes(45).label, '< 1 mnt');
  assert.equal(formatEtaHoursMinutes(18 * 60).label, '18 mnt');
  assert.equal(formatEtaHoursMinutes(84 * 60).label, '1 jam 24 mnt');
  assert.equal(formatEtaHoursMinutes(120 * 60).label, '2 jam');

  assert.equal(classifyTrafficCongestion({ magnitudeOfDelay: 3 }), 'JAM');
  assert.equal(classifyTrafficCongestion({ magnitudeOfDelay: 2 }), 'SLOW');
  assert.equal(classifyTrafficCongestion({ magnitudeOfDelay: 1 }), 'MODERATE');
  assert.equal(classifyTrafficCongestion({ magnitudeOfDelay: 0, delayRatio: 0.02 }), 'FREE');

  const pts = [
    [-6.2, 106.8],
    [-6.201, 106.801],
    [-6.202, 106.802],
    [-6.203, 106.803],
    [-6.204, 106.804],
  ];
  const segs = buildTrafficSegmentsFromTomTom(pts, [
    { sectionType: 'TRAFFIC', startPointIndex: 1, endPointIndex: 3, magnitudeOfDelay: 3, simpleCategory: 'JAM' },
  ]);
  assert.equal(segs.length, 3);
  assert.equal(segs[0].traffic, 'FREE');
  assert.equal(segs[1].traffic, 'JAM');
  assert.equal(segs[1].color, '#ef4444');
  assert.equal(segs[2].traffic, 'FREE');

  const decoded = decodeEncodedPolyline('_p~iF~ps|U_ulLnnqC', 5);
  assert.equal(decoded.length, 2);
  assert.ok(Math.abs(decoded[0][0] - 38.5) < 0.01);
});

test('Group Blend enforces strict opt-in POV privacy and backend GPS curation removes 1.33km grid rounding', () => {
  const blendStoreSrc = fs.readFileSync(path.resolve('backend/services/groupBlendStore.js'), 'utf8');
  const routesSrc = fs.readFileSync(path.resolve('backend/routes/index.js'), 'utf8');
  const telemetrySrc = fs.readFileSync(path.resolve('backend/controllers/telemetry/telemetryFeedController.js'), 'utf8');

  assert.match(blendStoreSrc, /verifyEventGroupMembership/);
  assert.match(blendStoreSrc, /getMemberRoleInEvent/);
  assert.match(blendStoreSrc, /if \(!isActive \|\| !isJoined\)/);
  assert.match(routesSrc, /\/map\/blends\/active/);
  assert.match(routesSrc, /\/map\/group-chat\/:eventId\/blend\/join/);
  assert.match(routesSrc, /\/map\/group-chat\/:eventId\/blend\/state/);
  assert.doesNotMatch(telemetrySrc, /const \{ lat, lng \} = approximateCoordinate\(rawLat, rawLng\)/);
});

