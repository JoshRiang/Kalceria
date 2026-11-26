import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PAGE_BG_CDN_BASE,
  MINIGAME_V60_CDN_BASE,
  MINIGAME_BG_THEMES,
  MINIGAME_ELEMENT_IDS,
  MINIGAME_ELEMENTS,
  MINIGAME_TRAILER_CHARACTERS,
  JOURNEY_SEGMENT_BG_THEMES,
  getMinigameBaseBgUrls,
  getJourneySegmentBgUrls,
} from '../lib/pageBgAssets.js';
import { MINIGAME_DOT_CONTOURS } from '../lib/minigameDotContours.js';
import {
  resolveResponsiveBgFamily,
  computeMinigameElementSlots,
  hasAnySlotOverlap,
} from '../lib/pageBgLayout.js';
import { buildHermesWireGraph } from '../lib/minigameHermesWires.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.resolve(__dirname, '..');

test('All V5.8 Journey (24) & V6.0 Minigame + Trailer (20) HD assets point to Cloudflare CDN and have local fallbacks', () => {
  assert.equal(PAGE_BG_CDN_BASE.endsWith('/media/page-bg/v58'), true);
  assert.equal(MINIGAME_V60_CDN_BASE.endsWith('/media/page-bg/v60'), true);

  const families = [
    ['desktop', 'localDesktop'],
    ['half', 'localHalf'],
    ['tablet', 'localTablet'],
    ['mobile', 'localMobile'],
  ];

  // 8 Minigame V6.0 4-family base canvases
  for (const mode of ['light', 'dark']) {
    const set = MINIGAME_BG_THEMES[mode];
    for (const [key, localKey] of families) {
      assert.equal(set[key].startsWith(`${MINIGAME_V60_CDN_BASE}/`), true);
      assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', set[localKey])), true);
    }
  }
  assert.match(getMinigameBaseBgUrls('tablet').light, /BG_Minigame_Base_Tablet_Light\.webp$/);
  assert.match(getMinigameBaseBgUrls('half').dark, /BG_Minigame_Base_Half_Dark\.webp$/);

  // 5 Minigame V6.0 uncropped individual subject pairs (10 WebPs)
  assert.equal(MINIGAME_ELEMENT_IDS.length, 5);
  for (const id of MINIGAME_ELEMENT_IDS) {
    const el = MINIGAME_ELEMENTS[id];
    assert.ok(el, `Missing MINIGAME_ELEMENTS.${id}`);
    assert.equal(el.light.startsWith(`${MINIGAME_V60_CDN_BASE}/`), true);
    assert.equal(el.dark.startsWith(`${MINIGAME_V60_CDN_BASE}/`), true);
    assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', el.localLight)), true);
    assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', el.localDark)), true);
  }

  // 2 Trailer half-body semi-pixel peeking characters
  for (const side of ['left', 'right']) {
    const ch = MINIGAME_TRAILER_CHARACTERS[side];
    assert.equal(ch.cdn.startsWith(`${MINIGAME_V60_CDN_BASE}/`), true);
    assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', ch.local)), true);
  }

  // 3 Journey segments x 4 device families x 2 modes (24 WebPs)
  for (const seg of [1, 2, 3]) {
    for (const mode of ['light', 'dark']) {
      const set = JOURNEY_SEGMENT_BG_THEMES[seg][mode];
      for (const [key, localKey] of families) {
        assert.equal(set[key].startsWith(`${PAGE_BG_CDN_BASE}/`), true);
        assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', set[localKey])), true);
      }
    }
  }

  assert.match(getJourneySegmentBgUrls(1, 'desktop').light, /BG_Journey1_Desktop_Light\.webp$/);
  assert.match(getJourneySegmentBgUrls(2, 'half').dark, /BG_Journey2_Half_Dark\.webp$/);
  assert.match(getJourneySegmentBgUrls(3, 'tablet').light, /BG_Journey3_Tablet_Light\.webp$/);
  assert.match(getJourneySegmentBgUrls(1, 'mobile').dark, /BG_Journey1_Mobile_Dark\.webp$/);
});

test('Responsive device-family classifier covers mobile, tablet/iPad, half-desktop, landscape mobile, and desktop', () => {
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

test('V6.0 Minigame micro-dots are dense (>=90) & 50% smaller (r<=3), with ZERO overlap & valid Hermes wire graph across 14 viewports', () => {
  const aspects = {};
  for (const id of MINIGAME_ELEMENT_IDS) {
    const contour = MINIGAME_DOT_CONTOURS[id];
    assert.ok(contour, `Missing contour for ${id}`);
    assert.ok(contour.dots.length >= 90, `Contour ${id} must be dense (>=90 micro-dots), got ${contour.dots.length}`);
    assert.ok(contour.dotRadius <= 3.0, `Contour ${id} dots must be ~50% smaller (<=3.0), got ${contour.dotRadius}`);
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
    const graph = buildHermesWireGraph(slots, vw, vh);
    assert.ok(graph.wires.length >= 10, `${label} must unite elements with 5 dual-stroke Hermes wire segments`);
    const segs = new Set(graph.wires.map((w) => w.segment));
    assert.deepEqual([...segs].sort((a, b) => a - b), [1, 2, 3, 4, 5], `${label} must contain all 5 sequential segments 1..5`);
    const mainDelays = [1, 2, 3, 4, 5].map(
      (s) => graph.wires.find((w) => w.segment === s && w.id.endsWith('-main')).delay
    );
    for (let i = 1; i < mainDelays.length; i++) {
      assert.ok(mainDelays[i] > mainDelays[i - 1], `${label} segment ${i + 1} delay must be strictly greater than segment ${i}`);
    }
  }
});

test('MinigameClient uses black no-glow bevel UI, borderless Attempt/Due/THE EVENT/i, removes MY VOUCHER, and keeps FlipGame', () => {
  const clientSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/minigame/MinigameClient.jsx'),
    'utf8'
  );
  const backdropSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/minigame/MinigameEditorialBackdrop.jsx'),
    'utf8'
  );
  const trailerSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/minigame/client/MinigameTrailerModal.jsx'),
    'utf8'
  );

  // Black bevel UI with zero yellow glow & zero voucher UI
  assert.equal(clientSrc.includes('rgba(255,255,0'), false, 'Yellow title glow must be removed');
  assert.equal(clientSrc.includes('MY VOUCHER'), false, 'MY VOUCHER UI must be removed');
  assert.equal(clientSrc.includes('MinigameVoucherModal'), false, 'Voucher modal must not be rendered on Minigame page');
  assert.equal(clientSrc.includes('bg-[#e60000]'), false, 'THE EVENT red outer box must be removed');
  assert.equal(clientSrc.includes('bg-[#15803d]'), false, 'Info green circle outer box must be removed');
  assert.equal(clientSrc.includes('bg-black/40 backdrop-blur'), false, 'Attempt/Due outer boxes must be removed');
  assert.equal(clientSrc.includes('TITLE_BEVEL_SHADOW'), true, '3D bevel structure must be preserved');
  assert.equal(clientSrc.includes('<FlipGame'), true);
  assert.equal(clientSrc.includes('handlePlayIt'), true);

  // Progressive circular draw-in micro-dots + Light-only sequential 5-segment Hermes wire layer
  assert.equal(backdropSrc.includes('kalceriaDotDrawIn'), true, 'Dots must animate progressively (. .. ... -> closed)');
  assert.equal(backdropSrc.includes('buildHermesWireGraph'), true, 'Must render united Hermes connecting wires');
  assert.equal(backdropSrc.includes('data-wire-segment'), true, 'Hermes wires must tag segments 1..5');
  assert.equal(backdropSrc.includes('isLight ?'), true, 'Sequential wire animation must be scoped to Light layer');
  assert.equal(backdropSrc.includes('prefers-reduced-motion'), true);

  // Center-stage HUD grouping + graceful Light fade-in after Save Score (Yes / No)
  assert.equal(clientSrc.includes('justify-center'), true, 'Title, cards, PLAY IT, and Due/Attempt must group in open center');
  assert.equal(clientSrc.includes('const inGame = gamePhase === "playing"'), true, 'FlipGame must unmount immediately on ending so Dark->Light fade is visible');
  const flipSrc = fs.readFileSync(
    path.join(FE_ROOT, 'app/minigame/FlipGame.jsx'),
    'utf8'
  );
  assert.equal(flipSrc.includes('bg-black/80'), false, 'Opaque bg-black/80 exit wall must be removed from FlipGame so Light fade is graceful');

  // Rules modal Light Blue-Gold gradient (zero indigo/purple)
  const rulesSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/minigame/client/MinigameRulesModal.jsx'),
    'utf8'
  );
  assert.equal(rulesSrc.includes('data-rules-theme="blue-gold"'), true, 'Rules modal must use Light blue-gold theme');
  assert.equal(rulesSrc.includes('#124cc6'), true, 'Rules modal must use Royal Cobalt Blue accent');
  assert.equal(rulesSrc.includes('#d6920c'), true, 'Rules modal must use Luminous Gold accent');
  assert.equal(/indigo-|purple-/.test(rulesSrc), false, 'Rules modal must not contain random purple/indigo gradients');

  // Event trailer modal: 4 corner faces purged, 2 peeking bottom slide-up characters gazing opposite directions
  assert.equal(trailerSrc.includes('/ge_1.webp'), false, 'Legacy corner face ge_1 must be purged from trailer');
  assert.equal(trailerSrc.includes('/ge_2.webp'), false, 'Legacy corner face ge_2 must be purged from trailer');
  assert.equal(trailerSrc.includes('/ge_3.webp'), false, 'Legacy corner face ge_3 must be purged from trailer');
  assert.equal(trailerSrc.includes('/ge_4.webp'), false, 'Legacy corner face ge_4 must be purged from trailer');
  assert.equal(trailerSrc.includes('MINIGAME_TRAILER_CHARACTERS'), true, 'Must render 2 peeking half-body characters');
  assert.equal(trailerSrc.includes('y: "115%"'), true, 'Characters must slide up from bottom of screen');
  assert.equal(trailerSrc.includes('data-peek-gaze="up-right"'), true, 'Left peeking character must gaze up-right');
  assert.equal(trailerSrc.includes('data-peek-gaze="up-left"'), true, 'Right peeking character must gaze up-left');
  assert.equal(trailerSrc.includes('transform: "scaleX(-1)"'), true, 'Left peeking character must mirror horizontally via explicit scaleX(-1)');
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
  assert.equal(backdropSrc.includes('useResponsiveBgFamily'), true);
  assert.equal(backdropSrc.includes('blur(18px) brightness(0.82)'), true);
  assert.equal(backdropSrc.includes('scale(1.05)'), true);
  assert.equal(backdropSrc.includes('bg-black/35'), true);
});
