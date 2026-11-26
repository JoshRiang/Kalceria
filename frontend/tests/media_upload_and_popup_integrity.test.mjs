import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAX_MEDIA_UPLOAD_BYTES,
  validateMediaUploadFile,
  cleanMediaFilename,
  formatMediaDisplayName,
  normalizeUploadErrorMessage,
} from '../lib/mediaUploadHelpers.js';
import {
  classifyMediaOrientation,
  computeCardGeometryForMedia,
} from '../components/map/eventPopup/popupGeometry.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');

// UserPopup.jsx is self-contained ES module JS with a .jsx extension; load via data URL so Node ESM handles it cleanly.
const userPopupSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'components/map/UserPopup.jsx'), 'utf8');
const { getBroadcastMessageBoxHtml } = await import(
  `data:text/javascript;base64,${Buffer.from(userPopupSrc, 'utf8').toString('base64')}`
);

describe('Media Upload Helpers (Zero AbortError & Validation Parity)', () => {
  it('enforces unified 10MB limit accurately', () => {
    assert.equal(MAX_MEDIA_UPLOAD_BYTES, 10 * 1024 * 1024);
    const oversized = { name: 'big.png', type: 'image/png', size: MAX_MEDIA_UPLOAD_BYTES + 1 };
    const res = validateMediaUploadFile(oversized);
    assert.equal(res.valid, false);
    assert.match(res.error, /10 MB/);

    const ok = { name: 'ok.jpg', type: 'image/jpeg', size: MAX_MEDIA_UPLOAD_BYTES };
    const okRes = validateMediaUploadFile(ok);
    assert.equal(okRes.valid, true);
    assert.equal(okRes.isVideo, false);
  });

  it('handles extensionless mobile/blob filenames via MIME fallback', () => {
    const camImg = { name: 'blob', type: 'image/jpeg;charset=utf-8', size: 120000 };
    const res1 = validateMediaUploadFile(camImg);
    assert.equal(res1.valid, true);
    assert.equal(res1.ext, 'jpg');
    assert.equal(res1.isVideo, false);

    const camVid = { name: 'recording', type: 'video/mp4', size: 500000 };
    const res2 = validateMediaUploadFile(camVid);
    assert.equal(res2.valid, true);
    assert.equal(res2.ext, 'mp4');
    assert.equal(res2.isVideo, true);
  });

  it('never leaks raw "signal is aborted without reason" or AbortError messages', () => {
    const abortErr1 = new Error('signal is aborted without reason');
    const msg1 = normalizeUploadErrorMessage(abortErr1);
    assert.ok(!msg1.toLowerCase().includes('signal is aborted'), `Leaked abort string: ${msg1}`);
    assert.match(msg1, /Waktu unggah habis/);

    const abortErr2 = new Error('The operation was aborted.');
    abortErr2.name = 'AbortError';
    const msg2 = normalizeUploadErrorMessage(abortErr2);
    assert.ok(!msg2.toLowerCase().includes('aborted'));
    assert.match(msg2, /Waktu unggah habis/);

    const payloadErr = { response: { status: 413 } };
    assert.match(normalizeUploadErrorMessage(payloadErr), /10 MB/);

    const netErr = new Error('Failed to fetch');
    assert.match(normalizeUploadErrorMessage(netErr), /Koneksi terganggu/);
  });

  it('cleans UUID, timestamps, Vercel hashes, and data URLs safely', () => {
    assert.equal(cleanMediaFilename('1731174928123-photo-xgFrwk6LKlT00nvx20bHRZ5v9QPR3W.png'), 'photo.png');
    assert.equal(cleanMediaFilename('data:image/jpeg;base64,/9j/4AAQ'), 'uploaded-media');
    assert.equal(
      formatMediaDisplayName('/api/blob/raw?url=https%3A%2F%2Fexample.blob.vercel-storage.com%2F1731174928123-clip.mp4'),
      'clip.mp4'
    );
    assert.equal(formatMediaDisplayName('blob:https://kalceria.id/123', { 'blob:https://kalceria.id/123': 'my.jpg' }), 'my.jpg');
  });
});

describe('Popup Media Geometry (Zero Black Lanes, Adaptive Portrait & Landscape)', () => {
  it('computes adaptive portrait and landscape dimensions cleanly for both Event Card and Broadcast Box', () => {
    // Portrait 9:16
    assert.equal(classifyMediaOrientation(1080, 1920), 'portrait');
    const evPortrait = computeCardGeometryForMedia(1080, 1920);
    assert.equal(evPortrait.orientation, 'portrait');
    assert.ok(evPortrait.frameHeight > evPortrait.cardWidth - 24, 'Event portrait height must exceed inner width');

    const bcastPortrait = computeCardGeometryForMedia(1080, 1920, { isBroadcast: true });
    assert.equal(bcastPortrait.orientation, 'portrait');
    assert.ok(bcastPortrait.frameHeight > bcastPortrait.cardWidth - 28, 'Broadcast portrait height must exceed inner width');

    // Landscape 16:9
    assert.equal(classifyMediaOrientation(1920, 1080), 'landscape');
    const evLand = computeCardGeometryForMedia(1920, 1080);
    assert.equal(evLand.orientation, 'landscape');
    assert.ok(evLand.cardWidth - 24 > evLand.frameHeight, 'Event landscape inner width must exceed height');

    const bcastLand = computeCardGeometryForMedia(1920, 1080, { isBroadcast: true });
    assert.equal(bcastLand.orientation, 'landscape');
    assert.ok(bcastLand.cardWidth - 28 > bcastLand.frameHeight, 'Broadcast landscape inner width must exceed height');
  });
});

describe('Broadcast Box Popup HTML (Owner Reply Hiding & Zero Black Strips)', () => {
  const sampleBroadcastUser = {
    id: 'user-creator-1',
    name: 'Creator Uji',
    nickname: 'creator',
    broadcast: {
      id: 'bcast-1',
      message: '[MEDIA:https://example.com/clip.mp4] Hello world',
      mediaUrl: 'https://example.com/clip.mp4',
      viewCount: 12,
      createdAt: new Date().toISOString(),
    },
  };

  it('hides Reply button inside media action bar when viewer IS the Broadcast creator', () => {
    const html = getBroadcastMessageBoxHtml(sampleBroadcastUser, true, { id: 'user-creator-1', nickname: 'creator' });
    assert.ok(html);
    assert.ok(!html.includes('__kalceriaReplyBroadcast'), 'Creator must NOT have reply callback anywhere in Broadcast Box');
    assert.ok(!html.includes('Balas broadcast ini'), 'Creator must NOT see media-row reply button');
    assert.ok(html.includes('__kalceriaEditBroadcast'), 'Creator should see Edit button');
  });

  it('shows Reply button inside media action bar when viewer is NOT the Broadcast creator', () => {
    const html = getBroadcastMessageBoxHtml(sampleBroadcastUser, false, { id: 'user-other-2', nickname: 'other' });
    assert.ok(html);
    assert.ok(html.includes('__kalceriaReplyBroadcast'), 'Other user must see reply button');
    assert.ok(html.includes('Balas broadcast ini'), 'Other user must see media-row reply button');
  });

  it('uses .popup-video wrapper and object-fit: cover with zero object-fit: contain or black strip backgrounds', () => {
    const html = getBroadcastMessageBoxHtml(sampleBroadcastUser, false, { id: 'user-other-2' });
    assert.ok(html.includes('class="popup-video"'), 'Broadcast media must use .popup-video for carousel geometry sync');
    assert.ok(html.includes('object-fit: cover; object-position: center;'), 'Broadcast video/img must fill inner box with object-fit: cover');
    assert.ok(!html.includes('object-fit: contain'), 'Broadcast box must NOT use object-fit: contain (causes black lanes)');
    assert.ok(!html.includes('max-height: 240px'), 'Broadcast media must NOT artificially cap at 240px leaving black bars');
  });
});

describe('Static Structural Verification of Event Card & CSS Cover Rules', () => {
  it('verifies EventPopup background opacity is muted, slide uses authorId check, and media uses object-fit: cover', () => {
    const eventPopupSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'components/map/EventPopup.jsx'), 'utf8');
    const rendererSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'components/map/eventPopup/popupMediaRenderer.js'), 'utf8');
    const positionerSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'components/map/eventPopup/popupSlidePositioner.js'), 'utf8');
    const cssSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'components/map/map-card.css'), 'utf8');
    const apiSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'lib/api.js'), 'utf8');

    assert.ok(eventPopupSrc.includes('isMapDark ? 0.92 : 0.95'), 'Event card HD background opacity must preserve crisp light/dark balance');
    assert.ok(eventPopupSrc.includes('data-current-user-id'), 'Event card must store viewer user ID for per-slide reply gating');
    assert.ok(
      eventPopupSrc.includes('isFirstSlideSelfAuthor ? getTrashIconSvg(isMapDark) : getReplyIconSvg(isMapDark)'),
      'Slide 0 action button must display Trashcan icon when viewer is clip author'
    );
    assert.ok(rendererSrc.includes('data-author-id'), 'Each slide must carry data-author-id');
    assert.ok(rendererSrc.includes('object-fit: cover; object-position: center;'), 'Event carousel slides must use object-fit: cover');
    assert.ok(!rendererSrc.includes('object-fit: contain'), 'Event carousel slides must NOT use object-fit: contain');
    assert.ok(
      positionerSrc.includes('getTrashIconSvg(isMapDark)'),
      'Slide switcher must swap to Trashcan icon on self-posted slides'
    );
    assert.ok(cssSrc.includes('object-fit: cover;'), 'CSS .popup-video media rule must use object-fit: cover');
    assert.ok(!cssSrc.includes('object-fit: contain'), 'CSS .popup-video media rule must NOT use object-fit: contain');
    assert.ok(!apiSrc.includes('setTimeout(() => controller.abort(), 8000)'), 'Premature 8s unreasoned abort must be removed');
    assert.ok(apiSrc.includes('normalizeUploadErrorMessage'), 'uploadBlobMedia must normalize errors');
  });
});
