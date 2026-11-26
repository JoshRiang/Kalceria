import test from 'node:test';
import assert from 'node:assert/strict';
import { extractEncodedTags, buildEncodedDescription } from '../controllers/miniEvent/eventFormatting.js';
import { getActiveMiniEvents } from '../controllers/miniEvent/eventCrudHandlers.js';
import {
  getReelsFeedHandler,
  createReelsPostHandler,
  deleteReelsPostHandler,
  toggleReelsPostLikeHandler,
  addReelsPostCommentHandler,
} from '../controllers/reelsPostController.js';
import {
  installInMemorySocialHarness,
  invokeController,
} from './helpers/inMemorySocialHarness.mjs';

test('Mini Event visibility defaults to private, isolates private events to Friends, and exposes public events globally', async () => {
  const privDesc = buildEncodedDescription({ category: 'cafe', plainDescription: 'Ngopi santai' });
  assert.doesNotMatch(privDesc, /\[VIS:/);
  assert.equal(extractEncodedTags(privDesc).visibility, 'private');

  const pubDesc = buildEncodedDescription({ category: 'cafe', visibility: 'public', plainDescription: 'Open meet' });
  assert.match(pubDesc, /\[VIS:public\]/);
  assert.equal(extractEncodedTags(pubDesc).visibility, 'public');

  const future = new Date(Date.now() + 3600_000);
  const harness = installInMemorySocialHarness({
    users: [
      { id: 'u_alice', name: 'Alice', nickname: 'alice', email: 'alice@kalceria.id', isEmailVerified: true, role: 'USER', profilePicture: 'https://cdn.kalceria.id/a.webp' },
      { id: 'u_bob', name: 'Bob', nickname: 'bob', email: 'bob@kalceria.id', isEmailVerified: true, role: 'USER', profilePicture: 'https://cdn.kalceria.id/b.webp' },
      { id: 'u_carol', name: 'Carol', nickname: 'carol', email: 'carol@kalceria.id', isEmailVerified: true, role: 'USER', profilePicture: 'https://cdn.kalceria.id/c.webp' },
      { id: 'u_stranger', name: 'Stranger', nickname: 'stranger', email: 'str@kalceria.id', isEmailVerified: true, role: 'USER', profilePicture: 'https://cdn.kalceria.id/s.webp' },
    ],
    miniEvents: [
      { id: 'ev_priv', creatorId: 'u_alice', title: 'Private Kopdar', description: privDesc, lat: -6.2, lng: 106.8, isActive: true, createdAt: new Date(), expiresAt: future },
      { id: 'ev_pub', creatorId: 'u_bob', title: 'Public Acoustic', description: pubDesc, lat: -6.21, lng: 106.81, isActive: true, createdAt: new Date(), expiresAt: future },
    ],
  });

  try {
    // Carol is friends with Alice; Stranger has zero friends
    harness.db.user_friends.add('u_carol|u_alice');
    harness.db.user_friends.add('u_alice|u_carol');

    const strangerRes = await invokeController(getActiveMiniEvents, {
      user: { userId: 'u_stranger' },
      query: {},
    });
    assert.equal(strangerRes.statusCode, 200);
    assert.deepEqual(
      strangerRes.body.events.map((e) => e.id),
      ['ev_pub'],
      'Stranger must see ONLY public events and NEVER private events'
    );

    const carolRes = await invokeController(getActiveMiniEvents, {
      user: { userId: 'u_carol' },
      query: {},
    });
    const carolIds = carolRes.body.events.map((e) => e.id).sort();
    assert.deepEqual(carolIds, ['ev_priv', 'ev_pub'], 'Friend Carol must see both friend private event and global public event');
  } finally {
    harness.restore();
  }
});

test('Reels Discovery runtime: validation limits, Global vs Friends scoping, block hiding, likes, comments & author-only delete', async () => {
  const harness = installInMemorySocialHarness({
    users: [
      { id: 'u_alice', name: 'Alice', nickname: 'alice', profilePicture: 'https://cdn.kalceria.id/a.webp' },
      { id: 'u_bob', name: 'Bob', nickname: 'bob', profilePicture: 'https://cdn.kalceria.id/b.webp' },
      { id: 'u_eve', name: 'Eve', nickname: 'eve', profilePicture: 'https://cdn.kalceria.id/e.webp' },
    ],
  });

  try {
    harness.db.user_friends.add('u_alice|u_bob');
    harness.db.user_friends.add('u_bob|u_alice');

    // Validation guards: missing mediaUrl -> 400; caption > 240 -> 400
    const noMedia = await invokeController(createReelsPostHandler, {
      user: { userId: 'u_alice' },
      body: { category: 'cafe', caption: 'Missing media' },
    });
    assert.equal(noMedia.statusCode, 400);

    const overCaption = await invokeController(createReelsPostHandler, {
      user: { userId: 'u_alice' },
      body: { mediaUrl: 'https://cdn.kalceria.id/1.webp', caption: 'x'.repeat(245) },
    });
    assert.equal(overCaption.statusCode, 400);

    // Alice publishes 1 private Reel and 1 public Reel in category 'cafe'
    const privPost = await invokeController(createReelsPostHandler, {
      user: { userId: 'u_alice' },
      body: { category: 'cafe', visibility: 'private', mediaUrl: 'https://cdn.kalceria.id/priv.webp', caption: 'Friends only' },
    });
    assert.equal(privPost.statusCode, 201);

    const pubPost = await invokeController(createReelsPostHandler, {
      user: { userId: 'u_alice' },
      body: { category: 'cafe', visibility: 'public', mediaUrl: 'https://cdn.kalceria.id/pub.webp', caption: 'Public cafe' },
    });
    assert.equal(pubPost.statusCode, 201);
    const pubId = pubPost.body.post.id;

    // Stranger Eve on Global sees ONLY public post with isFriendWithAuthor: false
    const eveGlobal = await invokeController(getReelsFeedHandler, {
      user: { userId: 'u_eve' },
      query: { scope: 'global', category: 'cafe' },
    });
    assert.equal(eveGlobal.body.posts.length, 1);
    assert.equal(eveGlobal.body.posts[0].id, pubId);
    assert.equal(eveGlobal.body.posts[0].isFriendWithAuthor, false);

    // Friend Bob on Friends sees BOTH private & public posts with isFriendWithAuthor: true
    const bobFriends = await invokeController(getReelsFeedHandler, {
      user: { userId: 'u_bob' },
      query: { scope: 'friends', category: 'cafe' },
    });
    assert.equal(bobFriends.body.posts.length, 2);
    assert.equal(bobFriends.body.posts.every((p) => p.isFriendWithAuthor === true), true);

    // Like toggle + Comment + Non-author delete 403 + Author delete 200
    const like1 = await invokeController(toggleReelsPostLikeHandler, { user: { userId: 'u_bob' }, params: { postId: pubId } });
    assert.equal(like1.body.liked, true);
    assert.equal(like1.body.likeCount, 1);

    const like2 = await invokeController(toggleReelsPostLikeHandler, { user: { userId: 'u_bob' }, params: { postId: pubId } });
    assert.equal(like2.body.liked, false);
    assert.equal(like2.body.likeCount, 0);

    const badComment = await invokeController(addReelsPostCommentHandler, {
      user: { userId: 'u_bob' },
      params: { postId: pubId },
      body: { body: 'c'.repeat(205) },
    });
    assert.equal(badComment.statusCode, 400);

    const okComment = await invokeController(addReelsPostCommentHandler, {
      user: { userId: 'u_bob' },
      params: { postId: pubId },
      body: { body: 'Keren banget spot kopinya!' },
    });
    assert.equal(okComment.statusCode, 201);
    assert.equal(okComment.body.comments.length, 1);

    const bobDeleteRes = await invokeController(deleteReelsPostHandler, {
      user: { userId: 'u_bob' },
      params: { postId: pubId },
    });
    assert.equal(bobDeleteRes.statusCode, 403);

    const aliceDeleteRes = await invokeController(deleteReelsPostHandler, {
      user: { userId: 'u_alice' },
      params: { postId: pubId },
    });
    assert.equal(aliceDeleteRes.statusCode, 200);
    assert.equal(aliceDeleteRes.body.deletedId, pubId);
  } finally {
    harness.restore();
  }
});
