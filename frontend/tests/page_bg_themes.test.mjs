import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PAGE_BG_CDN_BASE,
  MINIGAME_BG_THEMES,
  JOURNEY_SEGMENT_BG_THEMES,
  getJourneySegmentBgUrls,
} from '../lib/pageBgAssets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.resolve(__dirname, '..');

test('All 16 Minigame & Journey HD background assets point to Cloudflare CDN and have existing local fallbacks', () => {
  const allPairs = [
    MINIGAME_BG_THEMES.light,
    MINIGAME_BG_THEMES.dark,
    JOURNEY_SEGMENT_BG_THEMES[1].light,
    JOURNEY_SEGMENT_BG_THEMES[1].dark,
    JOURNEY_SEGMENT_BG_THEMES[2].light,
    JOURNEY_SEGMENT_BG_THEMES[2].dark,
    JOURNEY_SEGMENT_BG_THEMES[3].light,
    JOURNEY_SEGMENT_BG_THEMES[3].dark,
  ];

  for (const pair of allPairs) {
    assert.equal(pair.desktop.startsWith(`${PAGE_BG_CDN_BASE}/`), true);
    assert.equal(pair.mobile.startsWith(`${PAGE_BG_CDN_BASE}/`), true);
    const dLocal = path.join(FE_ROOT, 'public', pair.localDesktop);
    const mLocal = path.join(FE_ROOT, 'public', pair.localMobile);
    assert.equal(fs.existsSync(dLocal), true, `Missing local fallback: ${dLocal}`);
    assert.equal(fs.existsSync(mLocal), true, `Missing local fallback: ${mLocal}`);
  }

  const seg1Desk = getJourneySegmentBgUrls(1, false);
  const seg1Mob = getJourneySegmentBgUrls(1, true);
  assert.match(seg1Desk.light, /BG_Journey1_Light\.webp$/);
  assert.match(seg1Desk.dark, /BG_Journey1_Dark\.webp$/);
  assert.match(seg1Mob.light, /BG_Journey1_Mobile_Light\.webp$/);
  assert.match(seg1Mob.dark, /BG_Journey1_Mobile_Dark\.webp$/);
});

test('MinigameClient uses dual-scheme Light (Gold-Blue) -> Dark (Pink-Gold) crossfade without regressing game controls', () => {
  const src = fs.readFileSync(
    path.join(FE_ROOT, 'components/minigame/MinigameClient.jsx'),
    'utf8'
  );
  assert.equal(src.includes('MINIGAME_BG_THEMES.light'), true);
  assert.equal(src.includes('MINIGAME_BG_THEMES.dark'), true);
  assert.equal(src.includes('isPlayDarkTheme'), true);
  assert.equal(src.includes('<FlipGame'), true);
  assert.equal(src.includes('handlePlayIt'), true);
  assert.equal(src.includes('/bg_game.webp'), false, 'Legacy pixel background must be replaced');
});

test('JourneyPageClient applies dual-scheme backdrops to top 3 segments only, preserves blur(18px), and leaves JourneySection4 untouched', () => {
  const pageSrc = fs.readFileSync(
    path.join(FE_ROOT, 'app/journey/JourneyPageClient.jsx'),
    'utf8'
  );
  assert.equal(pageSrc.includes('segmentIndex={1}'), true);
  assert.equal(pageSrc.includes('segmentIndex={2}'), true);
  assert.equal(pageSrc.includes('segmentIndex={3}'), true);
  assert.equal(pageSrc.includes('segmentIndex={4}'), false);
  assert.equal(pageSrc.includes('<JourneySection4 isMobile={isMobile} />'), true);
  assert.equal(pageSrc.includes('bgj_1_arcade.webp'), false);
  assert.equal(pageSrc.includes('bgj_2.webp'), false);
  assert.equal(pageSrc.includes('bgj_3.webp'), false);

  const backdropSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/journey/JourneySegmentBackdrop.jsx'),
    'utf8'
  );
  assert.equal(backdropSrc.includes('blur(18px) brightness(0.82)'), true, 'Existing blur logic must be preserved');
  assert.equal(backdropSrc.includes('scale(1.05)'), true, 'Existing zoom logic must be preserved');
  assert.equal(backdropSrc.includes('bg-black/35'), true, 'Existing flip focus veil must be preserved');
});
