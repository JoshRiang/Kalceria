import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ARCHIVE_IMPRESSION_LENGTH,
  sanitizeArchiveImpression,
  filterVisibleArchivesForViewer,
} from '../services/eventArchiveHelpers.js';
import {
  recordEventArchiveMedia,
  setUserArchivePrivacy,
} from '../services/eventArchiveStore.js';
import {
  getUserEventArchivesHandler,
  updateUserEventArchiveHandler,
  deleteUserEventArchiveHandler,
} from '../controllers/eventArchiveController.js';
import {
  installInMemorySocialHarness,
  invokeController,
} from './helpers/inMemorySocialHarness.mjs';

test('Event Archive impression sanitizes and clamps to 280 chars (distinct from media captions)', () => {
  assert.equal(MAX_ARCHIVE_IMPRESSION_LENGTH, 280);
  assert.equal(sanitizeArchiveImpression('  Seru banget kopdar malam ini!  '), 'Seru banget kopdar malam ini!');
  assert.equal(sanitizeArchiveImpression('a'.repeat(400)).length, 280);
});

test('filterVisibleArchivesForViewer enforces Owner vs Stranger visibility across Hide and Account Private Archive toggle', () => {
  const sample = [
    { id: 'a1', eventTitle: 'Ngopi Sore', isHidden: false, mediaItems: [{ id: 'm1', mediaUrl: 'https://cdn/1.webp' }] },
    { id: 'a2', eventTitle: 'Secret Meet', isHidden: true, mediaItems: [{ id: 'm2', mediaUrl: 'https://cdn/2.webp' }] },
  ];

  assert.equal(filterVisibleArchivesForViewer({ archives: sample, isOwnProfile: true, isArchivePrivate: true }).length, 2);
  assert.equal(filterVisibleArchivesForViewer({ archives: sample, isOwnProfile: false, isArchivePrivate: true }).length, 0);

  const publicVisible = filterVisibleArchivesForViewer({
    archives: sample,
    isOwnProfile: false,
    isArchivePrivate: false,
  });
  assert.deepEqual(publicVisible.map((a) => a.id), ['a1']);
});

test('Real runtime eventArchiveController enforces auto-ingestion, impression edit, per-event hide, account privacy, block isolation & destructive tombstone', async () => {
  const harness = installInMemorySocialHarness();

  try {
    // 1. Auto-ingest Alice's clips across 2 events
    const arch1Id = await recordEventArchiveMedia({
      userId: 'u_alice',
      eventId: 'ev_1',
      eventTitle: 'Ngopi Senopati',
      eventCategory: 'cafe',
      mediaItems: [{ mediaUrl: 'https://cdn.kalceria.id/ev1.webp', caption: 'Media caption' }],
    });
    const arch2Id = await recordEventArchiveMedia({
      userId: 'u_alice',
      eventId: 'ev_2',
      eventTitle: 'Night Ride',
      eventCategory: 'special',
      mediaItems: [{ mediaUrl: 'https://cdn.kalceria.id/ev2.mp4', mediaType: 'video' }],
    });
    assert.ok(arch1Id && arch2Id);

    // 2. Non-owner Bob CANNOT edit or delete Alice's archive (HTTP 403)
    const bobEdit = await invokeController(updateUserEventArchiveHandler, {
      user: { userId: 'u_bob' },
      params: { archiveId: arch1Id },
      body: { impression: 'Tampered' },
    });
    assert.equal(bobEdit.statusCode, 403);

    const bobDelete = await invokeController(deleteUserEventArchiveHandler, {
      user: { userId: 'u_bob' },
      params: { archiveId: arch1Id },
    });
    assert.equal(bobDelete.statusCode, 403);

    // 3. Owner Alice updates Event 1 impression (clamped to 280) and hides Event 2
    const edit1 = await invokeController(updateUserEventArchiveHandler, {
      user: { userId: 'u_alice' },
      params: { archiveId: arch1Id },
      body: { impression: 'S'.repeat(350) },
    });
    assert.equal(edit1.statusCode, 200);
    assert.equal(edit1.body.impression.length, 280);

    const hide2 = await invokeController(updateUserEventArchiveHandler, {
      user: { userId: 'u_alice' },
      params: { archiveId: arch2Id },
      body: { isHidden: true },
    });
    assert.equal(hide2.body.isHidden, true);

    // 4. Owner Alice sees BOTH stacks; Stranger Bob sees ONLY non-hidden Event 1
    const aliceList = await invokeController(getUserEventArchivesHandler, {
      user: { userId: 'u_alice' },
      params: { targetUserId: 'u_alice' },
    });
    assert.equal(aliceList.body.archives.length, 2);

    const bobPublicList = await invokeController(getUserEventArchivesHandler, {
      user: { userId: 'u_bob' },
      params: { targetUserId: 'u_alice' },
    });
    assert.deepEqual(bobPublicList.body.archives.map((a) => a.id), [arch1Id]);

    // 5. Blocked viewer Eve sees ZERO stacks even while Alice's archive is public
    harness.db.canonical_blocks.add('u_alice|u_eve');
    const eveBlockedList = await invokeController(getUserEventArchivesHandler, {
      user: { userId: 'u_eve' },
      params: { targetUserId: 'u_alice' },
    });
    assert.equal(eveBlockedList.body.isArchivePrivate, true);
    assert.equal(eveBlockedList.body.archives.length, 0);

    // 6. Account-level Private Archive toggle hides ALL stacks from Bob, while Owner still sees all
    await setUserArchivePrivacy('u_alice', true);
    const bobPrivateList = await invokeController(getUserEventArchivesHandler, {
      user: { userId: 'u_bob' },
      params: { targetUserId: 'u_alice' },
    });
    assert.equal(bobPrivateList.body.isArchivePrivate, true);
    assert.equal(bobPrivateList.body.archives.length, 0);

    // 7. Destructive delete removes Event 1 permanently & writes tombstone preventing backfill resurrection
    const del1 = await invokeController(deleteUserEventArchiveHandler, {
      user: { userId: 'u_alice' },
      params: { archiveId: arch1Id },
    });
    assert.equal(del1.statusCode, 200);
    assert.equal(del1.body.deleted, true);
    assert.equal(harness.db.user_event_archive_deleted.has('u_alice|ev_1'), true);

    const aliceAfterDel = await invokeController(getUserEventArchivesHandler, {
      user: { userId: 'u_alice' },
      params: { targetUserId: 'u_alice' },
    });
    assert.deepEqual(aliceAfterDel.body.archives.map((a) => a.id), [arch2Id]);
  } finally {
    harness.restore();
  }
});
