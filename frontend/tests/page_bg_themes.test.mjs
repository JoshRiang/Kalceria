import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PAGE_BG_CDN_BASE,
  MINIGAME_BG_THEMES,
  MINIGAME_ELEMENT_IDS,
  MINIGAME_ELEMENTS,
  JOURNEY_SEGMENT_BG_THEMES,
  getJourneySegmentBgUrls,
} from '../lib/pageBgAssets.js';
import { MINIGAME_DOT_CONTOURS } from '../lib/minigameDotContours.js';
import {
  resolveResponsiveBgFamily,
  computeMinigameElementSlots,
  hasAnySlotOverlap,
} from '../lib/pageBgLayout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.resolve(__dirname, '..');

test('All 38 V5.8 Minigame & 4-family unified Journey HD assets point to Cloudflare CDN v58 and have local fallbacks', () => {
  assert.equal(PAGE_BG_CDN_BASE.endsWith('/media/page-bg/v58'), true, 'Must serve v58 CDN bundle');

  // 4 Minigame dual-scheme base canvases
  for (const mode of ['light', 'dark']) {
    const pair = MINIGAME_BG_THEMES[mode];
    assert.equal(pair.desktop.startsWith(`${PAGE_BG_CDN_BASE}/`), true);
    assert.equal(pair.mobile.startsWith(`${PAGE_BG_CDN_BASE}/`), true);
    assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', pair.localDesktop)), true);
    assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', pair.localMobile)), true);
  }

  // 5 Minigame individual transparent subject pairs (10 WebPs)
  assert.equal(MINIGAME_ELEMENT_IDS.length, 5);
  for (const id of MINIGAME_ELEMENT_IDS) {
    const el = MINIGAME_ELEMENTS[id];
    assert.ok(el, `Missing MINIGAME_ELEMENTS.${id}`);
    assert.equal(el.light.startsWith(`${PAGE_BG_CDN_BASE}/`), true);
    assert.equal(el.dark.startsWith(`${PAGE_BG_CDN_BASE}/`), true);
    assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', el.localLight)), true);
    assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', el.localDark)), true);
  }

  // 3 Journey segments x 4 device families x 2 modes (24 WebPs)
  const families = [
    ['desktop', 'localDesktop', 'Desktop'],
    ['half', 'localHalf', 'Half'],
    ['tablet', 'localTablet', 'Tablet'],
    ['mobile', 'localMobile', 'Mobile'],
  ];
  for (const seg of [1, 2, 3]) {
    for (const mode of ['light', 'dark']) {
      const set = JOURNEY_SEGMENT_BG_THEMES[seg][mode];
      for (const [key, localKey] of families) {
        assert.equal(set[key].startsWith(`${PAGE_BG_CDN_BASE}/`), true);
        assert.equal(
          fs.existsSync(path.join(FE_ROOT, 'public', set[localKey])),
          true,
          `Missing local fallback: ${set[localKey]}`
        );
      }
    }
  }

  // Verify helper resolves all 4 families + legacy boolean
  assert.match(getJourneySegmentBgUrls(1, 'desktop').light, /BG_Journey1_Desktop_Light\.webp$/);
  assert.match(getJourneySegmentBgUrls(2, 'half').dark, /BG_Journey2_Half_Dark\.webp$/);
  assert.match(getJourneySegmentBgUrls(3, 'tablet').light, /BG_Journey3_Tablet_Light\.webp$/);
  assert.match(getJourneySegmentBgUrls(1, 'mobile').dark, /BG_Journey1_Mobile_Dark\.webp$/);
  assert.match(getJourneySegmentBgUrls(1, true).light, /BG_Journey1_Mobile_Light\.webp$/);
});

test('Responsive device-family classifier covers mobile, tablet, half-desktop, landscape mobile, and desktop accurately', () => {
  assert.equal(resolveResponsiveBgFamily(375, 667), 'mobile');
  assert.equal(resolveResponsiveBgFamily(390, 844), 'mobile');
  assert.equal(resolveResponsiveBgFamily(768, 1024), 'tablet');
  assert.equal(resolveResponsiveBgFamily(820, 1180), 'tablet');
  assert.equal(resolveResponsiveBgFamily(720, 900), 'tablet');
  assert.equal(resolveResponsiveBgFamily(1024, 768), 'half');
  assert.equal(resolveResponsiveBgFamily(1180, 820), 'half');
  assert.equal(resolveResponsiveBgFamily(1440, 900), 'desktop');
  assert.equal(resolveResponsiveBgFamily(1920, 1080), 'desktop');
  assert.equal(resolveResponsiveBgFamily(844, 390), 'desktop');
});

test('Minigame 5 elements + organic true-circular dotted contours have ZERO overlap across all 14 real viewports', () => {
  const aspects = {};
  for (const id of MINIGAME_ELEMENT_IDS) {
    const contour = MINIGAME_DOT_CONTOURS[id];
    assert.ok(contour, `Missing contour for ${id}`);
    assert.ok(contour.dots.length >= 24, `Contour ${id} must have >= 24 circular dots`);
    assert.ok(contour.width > 100 && contour.height > 100);
    aspects[id] = contour.aspect;
  }

  const viewports = [
    ['Small HP 360x640', 360, 640],
    ['iPhone SE 375x667', 375, 667],
    ['iPhone 15 390x844', 390, 844],
    ['Tall Android 412x915', 412, 915],
    ['HP Landscape 667x375', 667, 375],
    ['HP Landscape 844x390', 844, 390],
    ['Galaxy Fold 690x840', 690, 840],
    ['iPad Portrait 768x1024', 768, 1024],
    ['iPad Air 820x1180', 820, 1180],
    ['Half-Desktop 960x900', 960, 900],
    ['iPad Landscape 1024x768', 1024, 768],
    ['Laptop 1280x800', 1280, 800],
    ['Desktop 1920x1080', 1920, 1080],
    ['Ultrawide 2560x1080', 2560, 1080],
  ];

  for (const [label, vw, vh] of viewports) {
    const slots = computeMinigameElementSlots(vw, vh, aspects);
    assert.equal(slots.length, 5, `${label} must render all 5 Minigame elements`);
    assert.equal(
      hasAnySlotOverlap(slots, 4),
      false,
      `Minigame elements/dots overlapped on ${label} (${vw}x${vh}): ${JSON.stringify(slots)}`
    );
  }
});

test('MinigameClient delegates to MinigameEditorialBackdrop with true circular dotted contours and keeps game controls intact', () => {
  const clientSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/minigame/MinigameClient.jsx'),
    'utf8'
  );
  const backdropSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/minigame/MinigameEditorialBackdrop.jsx'),
    'utf8'
  );

  assert.equal(clientSrc.includes('MinigameEditorialBackdrop'), true);
  assert.equal(clientSrc.includes('isPlayDarkTheme'), true);
  assert.equal(clientSrc.includes('<FlipGame'), true);
  assert.equal(clientSrc.includes('handlePlayIt'), true);
  assert.equal(clientSrc.includes('/bg_game.webp'), false);

  assert.equal(backdropSrc.includes('<circle'), true, 'Must render true circular dots in SVG');
  assert.equal(backdropSrc.includes('MINIGAME_DOT_CONTOURS'), true);
  assert.equal(backdropSrc.includes('prefers-reduced-motion'), true);
  assert.equal(backdropSrc.includes('computeMinigameElementSlots'), true);
});

test('JourneyPageClient applies 4-family responsive backdrops to top 3 segments only, preserves blur(18px), and leaves JourneySection4 untouched', () => {
  const pageSrc = fs.readFileSync(
    path.join(FE_ROOT, 'app/journey/JourneyPageClient.jsx'),
    'utf8'
  );
  assert.equal(pageSrc.includes('segmentIndex={1}'), true);
  assert.equal(pageSrc.includes('segmentIndex={2}'), true);
  assert.equal(pageSrc.includes('segmentIndex={3}'), true);
  assert.equal(pageSrc.includes('segmentIndex={4}'), false);
  assert.equal(pageSrc.includes('<JourneySection4 isMobile={isMobile} />'), true);

  const backdropSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/journey/JourneySegmentBackdrop.jsx'),
    'utf8'
  );
  assert.equal(backdropSrc.includes('useResponsiveBgFamily'), true, 'Must support all 4 device families');
  assert.equal(backdropSrc.includes('blur(18px) brightness(0.82)'), true, 'Existing blur logic must be preserved');
  assert.equal(backdropSrc.includes('scale(1.05)'), true, 'Existing zoom logic must be preserved');
  assert.equal(backdropSrc.includes('bg-black/35'), true, 'Existing flip focus veil must be preserved');
});
