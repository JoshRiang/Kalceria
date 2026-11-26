import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_ARCHIVE_IMPRESSION_CHARS,
  buildArchiveDiscoveryHeading,
  getArchiveStackPreviewCards,
  filterVisibleArchiveStacks,
} from '../components/map/profileArchive/eventArchiveHelpers.js';

test('Event Archive helpers format exact Mini Discovery heading and extract up to 3 stack cards', () => {
  assert.equal(MAX_ARCHIVE_IMPRESSION_CHARS, 280);
  assert.equal(
    buildArchiveDiscoveryHeading('Adnan', 'Ngopi Sore'),
    'Adnan pada Event "Ngopi Sore"'
  );

  const cards = getArchiveStackPreviewCards({
    mediaItems: [
      { id: '1', mediaUrl: 'https://cdn/1.webp' },
      { id: '2', mediaUrl: 'https://cdn/2.webp' },
      { id: '3', mediaUrl: 'https://cdn/3.webp' },
      { id: '4', mediaUrl: 'https://cdn/4.webp' },
    ],
  });
  assert.equal(cards.length, 3);

  const visible = filterVisibleArchiveStacks(
    [
      { id: 'a1', isHidden: false, mediaItems: [{ id: '1', mediaUrl: 'https://cdn/1.webp' }] },
      { id: 'a2', isHidden: true, mediaItems: [{ id: '2', mediaUrl: 'https://cdn/2.webp' }] },
    ],
    { isOwnProfile: false, isArchivePrivate: false }
  );
  assert.equal(visible.length, 1);
  assert.equal(
    filterVisibleArchiveStacks(visible, { isOwnProfile: false, isArchivePrivate: true }).length,
    0
  );
});

test('Peer Profile & Group Profile are standalone panels (zero inline accordion overlap) and EditProfile has Private Archive toggle', () => {
  const cardItemSrc = fs.readFileSync(
    path.resolve('frontend/components/map/panel/KalcerianCardItem.jsx'),
    'utf8'
  );
  assert.doesNotMatch(cardItemSrc, /<KalcerianProfileCard/);

  const overlaySrc = fs.readFileSync(
    path.resolve('frontend/components/map/panel/KalceriansOverlayPanels.jsx'),
    'utf8'
  );
  assert.match(overlaySrc, /<PeerProfilePanel/);
  assert.match(overlaySrc, /<EventGroupChatPanel/);

  const profileCardSrc = fs.readFileSync(
    path.resolve('frontend/components/map/KalcerianProfileCard.jsx'),
    'utf8'
  );
  assert.match(profileCardSrc, /<ProfileEventArchiveSection/);

  const socialSrc = fs.readFileSync(
    path.resolve('frontend/components/map/editProfile/EditProfileSocialFields.jsx'),
    'utf8'
  );
  assert.match(socialSrc, /Private Event Archive/);
});

