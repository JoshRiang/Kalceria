import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BLEND_TRANSPORT_MODES,
  createGpsCuratorState,
  curateGpsFix,
  smoothAngleDegrees,
  formatBlendEta,
  formatBlendDistance,
  cycleFocusIndex,
} from '../components/map/blend/gpsCurator.js';

test('GPS Curator locks coordinates when stationary, rejects coarse IP outliers, and smooths moving bearings', () => {
  let st = createGpsCuratorState();
  const t0 = 1700000000000;

  // Initial good GNSS fix (~12m accuracy)
  st = curateGpsFix(st, { lat: -6.2088, lng: 106.8456, accuracy: 12, speed: 0, timestamp: t0 });
  assert.equal(st.initialized, true);
  assert.equal(st.isStationary, true);
  assert.equal(st.lat, -6.2088);

  // Micro GPS indoor drift (~4 meters, speed 0.2 m/s) -> MUST STAY LOCKED (zero wobble!)
  st = curateGpsFix(st, { lat: -6.20883, lng: 106.84562, accuracy: 14, speed: 0.2, timestamp: t0 + 3000 });
  assert.equal(st.isStationary, true);
  assert.equal(st.speed, 0);
  assert.equal(st.lat, -6.2088);
  assert.equal(st.lng, 106.8456);

  // Wild coarse IP outlier (~800m jump with 500m accuracy) -> MUST BE REJECTED!
  st = curateGpsFix(st, { lat: -6.216, lng: 106.851, accuracy: 500, speed: 0, timestamp: t0 + 6000 });
  assert.equal(st.lat, -6.2088);
  assert.equal(st.lng, 106.8456);

  // Real movement north (~35 meters in 4s, ~8.75 m/s, 10m accuracy) -> smoothly updates & computes heading
  st = curateGpsFix(st, { lat: -6.20848, lng: 106.8456, accuracy: 10, speed: 8.5, timestamp: t0 + 10000 });
  assert.equal(st.isStationary, false);
  assert.ok(st.lat > -6.2088);
  assert.ok(st.speed >= 8);

  // Shortest-arc circular heading smoothing across 355° -> 5°
  const smoothed = smoothAngleDegrees(355, 5, 0.5);
  assert.ok(smoothed >= 359 || smoothed <= 1);
});

test('Blend UI supports 5 transport modes, jam & menit ETA, circular focus arrow cycling, and SnapMap + GroupChat wiring', () => {
  assert.deepEqual(
    BLEND_TRANSPORT_MODES.map((m) => m.id),
    ['foot', 'motorcycle', 'car', 'bus', 'train']
  );
  assert.equal(formatBlendEta(20), 'Tiba');
  assert.equal(formatBlendEta(14 * 60), '14 mnt');
  assert.equal(formatBlendEta(95 * 60), '1 jam 35 mnt');
  assert.equal(formatBlendDistance(1450), '1.5 km');
  assert.equal(formatBlendDistance(320), '320 m');

  assert.equal(cycleFocusIndex(3, 0, -1), 2);
  assert.equal(cycleFocusIndex(3, 2, 1), 0);
  assert.equal(cycleFocusIndex(3, 1, 1), 2);

  const snapMapSrc = fs.readFileSync(path.resolve('frontend/components/SnapMap.jsx'), 'utf8');
  const groupChatSrc = fs.readFileSync(
    path.resolve('frontend/components/map/groupChat/EventGroupChatPanel.jsx'),
    'utf8'
  );
  assert.match(snapMapSrc, /<MapBlendController/);
  assert.match(groupChatSrc, /<GroupBlendBanner/);
});

