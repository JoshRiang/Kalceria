import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_ARCHIVE_IMPRESSION_LENGTH,
  sanitizeArchiveImpression,
  filterVisibleArchivesForViewer,
} from '../services/eventArchiveStore.js';

test('Event Archive impression sanitizes and clamps to 280 chars (distinct from media captions)', () => {
  assert.equal(MAX_ARCHIVE_IMPRESSION_LENGTH, 280);
  assert.equal(sanitizeArchiveImpression('  Seru banget kopdar malam ini!  '), 'Seru banget kopdar malam ini!');
  const long = 'a'.repeat(400);
  assert.equal(sanitizeArchiveImpression(long).length, 280);
});

test('filterVisibleArchivesForViewer respects account-level Private toggle and per-event Hide setting', () => {
  const sample = [
    { id: 'a1', eventTitle: 'Ngopi Sore', isHidden: false, mediaItems: [{ id: 'm1', mediaUrl: 'https://cdn/1.webp' }] },
    { id: 'a2', eventTitle: 'Secret Meet', isHidden: true, mediaItems: [{ id: 'm2', mediaUrl: 'https://cdn/2.webp' }] },
  ];

  // Owner always sees all stacks (including hidden and even when account archive is Private)
  assert.equal(
    filterVisibleArchivesForViewer({ archives: sample, isOwnProfile: true, isArchivePrivate: true }).length,
    2
  );

  // Other viewer when account archive is Private sees ZERO stacks
  assert.equal(
    filterVisibleArchivesForViewer({ archives: sample, isOwnProfile: false, isArchivePrivate: true }).length,
    0
  );

  // Other viewer when account archive is public sees ONLY non-hidden stacks
  const publicVisible = filterVisibleArchivesForViewer({
    archives: sample,
    isOwnProfile: false,
    isArchivePrivate: false,
  });
  assert.equal(publicVisible.length, 1);
  assert.equal(publicVisible[0].id, 'a1');
});

test('Backend auto-ingests event media into Event Archive and registers archive routes + profile privacy', () => {
  const crudSrc = fs.readFileSync(path.resolve('backend/controllers/miniEvent/eventCrudHandlers.js'), 'utf8');
  const mediaSrc = fs.readFileSync(path.resolve('backend/controllers/miniEvent/eventMediaHandlers.js'), 'utf8');
  const reelsSrc = fs.readFileSync(path.resolve('backend/services/reelsPostStore.js'), 'utf8');
  const profileSrc = fs.readFileSync(path.resolve('backend/controllers/auth/profileController.js'), 'utf8');
  const routesSrc = fs.readFileSync(path.resolve('backend/routes/index.js'), 'utf8');

  assert.match(crudSrc, /recordEventArchiveMedia/);
  assert.match(mediaSrc, /recordEventArchiveMedia/);
  assert.match(reelsSrc, /recordEventArchiveMedia/);
  assert.match(profileSrc, /isArchivePrivate/);
  assert.match(profileSrc, /setUserArchivePrivacy/);
  assert.match(routesSrc, /\/map\/profile\/:targetUserId\/archives/);
  assert.match(routesSrc, /\/map\/profile\/archives\/:archiveId/);
});

