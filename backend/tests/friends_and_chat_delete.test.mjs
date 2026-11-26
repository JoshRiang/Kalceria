import test from 'node:test';
import assert from 'node:assert/strict';
import { FRIEND_REQUEST_TTL_MS } from '../services/friendsStore.js';
import {
  getFriendsState,
  createFriendRequest,
  deleteFriendRequest,
  acceptFriendRequestHandler,
  rejectFriendRequestHandler,
} from '../controllers/friendsController.js';
import { sendCallSignal, getCallSignals } from '../controllers/personalChat/callSignalController.js';
import { getAllKalcerians } from '../controllers/telemetry/kalceriansDirectoryController.js';
import {
  installInMemorySocialHarness,
  invokeController,
} from './helpers/inMemorySocialHarness.mjs';

test('Friends lifecycle: 24h TTL, self/blocked/missing rejection, expiry 410, accept & reciprocal auto-accept', async () => {
  assert.equal(FRIEND_REQUEST_TTL_MS, 24 * 60 * 60 * 1000);

  const harness = installInMemorySocialHarness({
    users: [
      { id: 'u_alice', name: 'Alice', nickname: 'alice', email: 'alice@kalceria.id', isEmailVerified: true, role: 'USER' },
      { id: 'u_bob', name: 'Bob', nickname: 'bob', email: 'bob@kalceria.id', isEmailVerified: true, role: 'USER' },
      { id: 'u_carol', name: 'Carol', nickname: 'carol', email: 'carol@kalceria.id', isEmailVerified: true, role: 'USER' },
      { id: 'u_dave', name: 'Dave', nickname: 'dave', email: 'dave@kalceria.id', isEmailVerified: true, role: 'USER' },
      { id: 'u_unverified', name: 'Unv', nickname: 'unv', email: 'unv@kalceria.id', isEmailVerified: false, role: 'USER' },
    ],
  });

  try {
    // 1. Self-request rejected (400) & unverified target rejected (404)
    const selfRes = await invokeController(createFriendRequest, {
      user: { userId: 'u_alice' },
      params: { targetId: 'u_alice' },
    });
    assert.equal(selfRes.statusCode, 400);

    const unvRes = await invokeController(createFriendRequest, {
      user: { userId: 'u_alice' },
      params: { targetId: 'u_unverified' },
    });
    assert.equal(unvRes.statusCode, 404);

    // 2. Blocked user cannot receive friend request (403)
    harness.db.canonical_blocks.add('u_bob|u_alice');
    const blockedRes = await invokeController(createFriendRequest, {
      user: { userId: 'u_alice' },
      params: { targetId: 'u_bob' },
    });
    assert.equal(blockedRes.statusCode, 403);
    harness.db.canonical_blocks.delete('u_bob|u_alice');

    // 3. Alice sends friend request to Bob -> pending with ~24h expiry
    const reqRes = await invokeController(createFriendRequest, {
      user: { userId: 'u_alice' },
      params: { targetId: 'u_bob' },
    });
    assert.equal(reqRes.statusCode, 200);
    assert.equal(reqRes.body.status, 'pending');
    assert.deepEqual(reqRes.body.outgoingRequestIds, ['u_bob']);

    // 4. Expired request (>24h) returns HTTP 410 FRIEND_REQUEST_EXPIRED on accept
    harness.db.friend_requests.get('u_alice|u_bob').expires_at = new Date(Date.now() - 5000);
    const expRes = await invokeController(acceptFriendRequestHandler, {
      user: { userId: 'u_bob' },
      params: { targetId: 'u_alice' },
    });
    assert.equal(expRes.statusCode, 410);
    assert.equal(expRes.body.code, 'FRIEND_REQUEST_EXPIRED');

    // 5. Fresh request -> cancel -> re-send -> reject -> re-send -> accept => mutual friendship
    await invokeController(createFriendRequest, { user: { userId: 'u_alice' }, params: { targetId: 'u_bob' } });
    const cancelRes = await invokeController(deleteFriendRequest, { user: { userId: 'u_alice' }, params: { targetId: 'u_bob' } });
    assert.equal(cancelRes.body.status, 'cancelled');
    assert.deepEqual(cancelRes.body.outgoingRequestIds, []);

    await invokeController(createFriendRequest, { user: { userId: 'u_alice' }, params: { targetId: 'u_bob' } });
    const rejectRes = await invokeController(rejectFriendRequestHandler, { user: { userId: 'u_bob' }, params: { targetId: 'u_alice' } });
    assert.equal(rejectRes.body.status, 'rejected');

    await invokeController(createFriendRequest, { user: { userId: 'u_alice' }, params: { targetId: 'u_bob' } });
    const acceptRes = await invokeController(acceptFriendRequestHandler, { user: { userId: 'u_bob' }, params: { targetId: 'u_alice' } });
    assert.equal(acceptRes.statusCode, 200);
    assert.equal(acceptRes.body.status, 'accepted');
    assert.deepEqual(acceptRes.body.friendIds, ['u_alice']);

    const aliceState = await invokeController(getFriendsState, { user: { userId: 'u_alice' } });
    assert.deepEqual(aliceState.body.friendIds, ['u_bob']);

    // 6. Reciprocal simultaneous requests (Carol -> Dave, then Dave -> Carol) auto-accept!
    await invokeController(createFriendRequest, { user: { userId: 'u_carol' }, params: { targetId: 'u_dave' } });
    const autoAccept = await invokeController(createFriendRequest, { user: { userId: 'u_dave' }, params: { targetId: 'u_carol' } });
    assert.equal(autoAccept.body.status, 'accepted');
    assert.deepEqual(autoAccept.body.friendIds, ['u_carol']);
  } finally {
    harness.restore();
  }
});

test('Real runtime callSignalController enforces HTTP 403 for non-friends and delivers offers for friends', async () => {
  const harness = installInMemorySocialHarness();
  try {
    // Non-friend Eve attempts to call Alice -> MUST fail with HTTP 403
    const nonFriendRes = await invokeController(sendCallSignal, {
      user: { userId: 'u_eve', name: 'Eve' },
      params: { targetId: 'u_alice' },
      body: {
        callId: 'call_nonfriend_1',
        callMode: 'voice',
        signalType: 'offer',
        encryptedPayload: 'enc_sdp',
        nonce: 'nonce_nf_1',
      },
    });
    assert.equal(nonFriendRes.statusCode, 403);
    assert.match(nonFriendRes.body.error, /friends only/i);

    // Establish mutual friendship Alice <-> Bob -> offer succeeds (200) and Bob receives signal
    harness.db.user_friends.add('u_alice|u_bob');
    harness.db.user_friends.add('u_bob|u_alice');

    const friendRes = await invokeController(sendCallSignal, {
      user: { userId: 'u_bob', name: 'Bob' },
      params: { targetId: 'u_alice' },
      body: {
        callId: 'call_friend_1',
        callMode: 'video',
        signalType: 'offer',
        encryptedPayload: 'enc_sdp_video',
        nonce: 'nonce_f_1',
      },
    });
    assert.equal(friendRes.statusCode, 200);
    assert.equal(friendRes.body.ok, true);
    assert.equal(friendRes.body.packet.callMode, 'video');

    const alicePoll = await invokeController(getCallSignals, {
      user: { userId: 'u_alice' },
      query: { clear: 'true' },
    });
    assert.equal(alicePoll.body.signals.length, 1);
    assert.equal(alicePoll.body.signals[0].fromUserId, 'u_bob');
  } finally {
    harness.restore();
  }
});

test('Real runtime getAllKalcerians strips coordinates, online presence & broadcasts for non-friends while preserving them for friends', async () => {
  const futureExp = new Date(Date.now() + 3600_000);
  const harness = installInMemorySocialHarness({
    users: [
      {
        id: 'u_alice',
        name: 'Alice',
        nickname: 'alice',
        email: 'alice@kalceria.id',
        isEmailVerified: true,
        role: 'USER',
        allowLiveLocation: true,
        profilePicture: 'https://cdn.kalceria.id/a.webp',
        createdAt: new Date(),
        broadcast: null,
      },
      {
        id: 'u_bob',
        name: 'Bob Friend',
        nickname: 'bob',
        email: 'bob@kalceria.id',
        isEmailVerified: true,
        role: 'USER',
        allowLiveLocation: true,
        profilePicture: 'https://cdn.kalceria.id/b.webp',
        createdAt: new Date(),
        broadcast: { id: 'bc_bob', message: 'Ngopi yuk!', expiresAt: futureExp, createdAt: new Date() },
      },
      {
        id: 'u_eve',
        name: 'Eve Stranger',
        nickname: 'eve',
        email: 'eve@kalceria.id',
        isEmailVerified: true,
        role: 'USER',
        allowLiveLocation: true,
        profilePicture: 'https://cdn.kalceria.id/e.webp',
        createdAt: new Date(),
        broadcast: { id: 'bc_eve', message: 'Secret broadcast', expiresAt: futureExp, createdAt: new Date() },
      },
    ],
  });

  try {
    // Both Bob and Eve are live online in Redis
    harness.sets.set('active_users', new Set(['u_bob', 'u_eve']));
    harness.kv.set('live:user:u_bob', JSON.stringify({ lat: -6.2088, lng: 106.8456 }));
    harness.kv.set('live:user:u_eve', JSON.stringify({ lat: -6.21, lng: 106.85 }));

    // Only Bob is Alice's friend; Eve is NOT
    harness.db.user_friends.add('u_alice|u_bob');
    harness.db.user_friends.add('u_bob|u_alice');

    const res = await invokeController(getAllKalcerians, {
      user: { userId: 'u_alice' },
    });
    assert.equal(res.statusCode, 200);

    const bobCard = res.body.kalcerians.find((u) => u.id === 'u_bob');
    const eveCard = res.body.kalcerians.find((u) => u.id === 'u_eve');

    assert.equal(bobCard.friendshipStatus, 'friend');
    assert.equal(bobCard.isOnline, true);
    assert.ok(Number.isFinite(bobCard.lat) && Number.isFinite(bobCard.lng));
    assert.equal(bobCard.broadcast?.message, 'Ngopi yuk!');

    assert.equal(eveCard.friendshipStatus, 'none');
    assert.equal(eveCard.isOnline, false);
    assert.equal(eveCard.lat, null);
    assert.equal(eveCard.lng, null);
    assert.equal(eveCard.broadcast, null);
  } finally {
    harness.restore();
  }
});
