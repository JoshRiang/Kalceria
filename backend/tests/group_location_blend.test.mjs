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
import { addGroupMemberOnly } from '../services/eventGroupStore.js';
import {
  getMyActiveBlendsHandler,
  getGroupBlendHandler,
  inviteGroupBlendHandler,
  joinGroupBlendHandler,
  leaveGroupBlendHandler,
  updateGroupBlendStateHandler,
} from '../controllers/groupBlendController.js';
import {
  installInMemorySocialHarness,
  invokeController,
} from './helpers/inMemorySocialHarness.mjs';

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

test('Real runtime groupBlendController enforces GroupChat membership (403), Opt-In POV privacy, mode switch & auto-deactivate on last leave', async () => {
  const harness = installInMemorySocialHarness({
    users: [
      { id: 'u_maker', name: 'Maker Alice', nickname: 'alice', profilePicture: 'https://cdn.kalceria.id/a.webp' },
      { id: 'u_bob', name: 'Bob Member', nickname: 'bob', profilePicture: 'https://cdn.kalceria.id/b.webp' },
      { id: 'u_outsider', name: 'Eve Outsider', nickname: 'eve', profilePicture: 'https://cdn.kalceria.id/e.webp' },
    ],
    miniEvents: [
      {
        id: 'ev_blend',
        title: 'Kopdar Menteng',
        creatorId: 'u_maker',
        lat: -6.195,
        lng: 106.823,
        isActive: true,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    ],
  });

  try {
    await addGroupMemberOnly('ev_blend', 'u_bob');

    // 1. Outsider Eve CANNOT inspect or join Blend -> HTTP 403
    const outsiderGet = await invokeController(getGroupBlendHandler, {
      user: { userId: 'u_outsider' },
      params: { eventId: 'ev_blend' },
      query: { routes: 'false' },
    });
    assert.equal(outsiderGet.statusCode, 403);

    const outsiderJoin = await invokeController(joinGroupBlendHandler, {
      user: { userId: 'u_outsider' },
      params: { eventId: 'ev_blend' },
      body: { transportMode: 'foot' },
    });
    assert.equal(outsiderJoin.statusCode, 403);

    // 2. Maker Alice initiates Blend -> auto-joins with default mode 'foot' and posts blend_invite in GroupChat
    const inviteRes = await invokeController(inviteGroupBlendHandler, {
      user: { userId: 'u_maker' },
      params: { eventId: 'ev_blend' },
      body: { lat: -6.19505, lng: 106.82302, accuracy: 8, heading: 90, speed: 0, isStationary: true },
    });
    assert.equal(inviteRes.statusCode, 200);
    assert.equal(inviteRes.body.isJoined, true);
    assert.equal(inviteRes.body.myTransportMode, 'foot');
    assert.equal(inviteRes.body.participants.length, 1);
    assert.ok(Array.isArray(inviteRes.body.participants[0].route?.steps));
    const groupMsgs = Array.from(harness.db.event_group_messages.values());
    assert.equal(groupMsgs.some((m) => m.msg_type === 'blend_invite'), true);

    // 3. STRICT OPT-IN POV PRIVACY: Group member Bob (not yet joined) receives ZERO participant coords or routes!
    const bobBeforeJoin = await invokeController(getGroupBlendHandler, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_blend' },
      query: { routes: 'true' },
    });
    assert.equal(bobBeforeJoin.statusCode, 200);
    assert.equal(bobBeforeJoin.body.hasActiveBlend, true);
    assert.equal(bobBeforeJoin.body.isJoined, false);
    assert.deepEqual(bobBeforeJoin.body.participants, []);
    assert.equal(bobBeforeJoin.body.destination, null);

    // Non-joined Bob cannot push state updates (403)
    const bobEarlyUpdate = await invokeController(updateGroupBlendStateHandler, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_blend' },
      body: { transportMode: 'motorcycle' },
    });
    assert.equal(bobEarlyUpdate.statusCode, 403);

    // 4. Bob joins Blend -> BOTH Alice & Bob appear in active Blend convoy with real routes & steps[]
    const bobJoin = await invokeController(joinGroupBlendHandler, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_blend' },
      body: { transportMode: 'motorcycle', lat: -6.19508, lng: 106.82305, accuracy: 6, heading: 45, speed: 0, isStationary: true },
    });
    assert.equal(bobJoin.statusCode, 200);
    assert.equal(bobJoin.body.isJoined, true);
    assert.equal(bobJoin.body.joinedCount, 2);
    assert.equal(bobJoin.body.myTransportMode, 'motorcycle');

    // Bob updates transport mode to 'train' and checks active blends list
    const bobSwitch = await invokeController(updateGroupBlendStateHandler, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_blend' },
      body: { transportMode: 'train', heading: 180, speed: 5.2, isStationary: false },
    });
    assert.equal(bobSwitch.body.myTransportMode, 'train');

    const activeBlends = await invokeController(getMyActiveBlendsHandler, {
      user: { userId: 'u_bob' },
    });
    assert.equal(activeBlends.body.blends.length, 1);
    assert.equal(activeBlends.body.blends[0].eventId, 'ev_blend');

    // 5. Both leave Blend -> Blend automatically deactivates (is_active = false)
    await invokeController(leaveGroupBlendHandler, { user: { userId: 'u_bob' }, params: { eventId: 'ev_blend' } });
    await invokeController(leaveGroupBlendHandler, { user: { userId: 'u_maker' }, params: { eventId: 'ev_blend' } });
    assert.equal(harness.db.event_group_blends.get('ev_blend')?.is_active, false);
  } finally {
    harness.restore();
  }
});
