import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  INTRO_CAR_CDN_BASE,
  INTRO_CAR_VIDEO_POOL,
  computeResponsiveIntroGrid,
  computeCoverCropRect,
  selectSessionIntroVideos,
  assignUniqueNodeVideos,
  swapNodeWithUnusedVideo,
} from '../components/preloader/introVideoGridLayout.js';
import { INTRO_TIMELINE } from '../components/preloader/introTimelineConfig.js';
import {
  ABOUT_VIDEOS,
  assignDistinctAboutVideos,
  pickNextDistinctAboutVideo,
} from '../components/about/aboutVideoSelector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.resolve(__dirname, '..');

test('Intro car video pool contains 15 distinct Cloudflare Edge CDN clips and samples without duplicates', () => {
  assert.equal(INTRO_CAR_VIDEO_POOL.length, 15);
  assert.equal(new Set(INTRO_CAR_VIDEO_POOL).size, 15);
  for (const url of INTRO_CAR_VIDEO_POOL) {
    assert.equal(url.startsWith(`${INTRO_CAR_CDN_BASE}/car-`), true);
    assert.equal(url.endsWith('.mp4'), true);
  }

  const pickedDesktop = selectSessionIntroVideos(INTRO_CAR_VIDEO_POOL, 8, () => 0.42);
  assert.equal(pickedDesktop.length, 8);
  assert.equal(new Set(pickedDesktop).size, 8);

  const pickedMobile = selectSessionIntroVideos(INTRO_CAR_VIDEO_POOL, 4, () => 0.77);
  assert.equal(pickedMobile.length, 4);
  assert.equal(new Set(pickedMobile).size, 4);
});

test('Responsive intro node grid stays lean (6-12 nodes) and avoids overly portrait cells across all device families', () => {
  const viewports = [
    { name: 'Desktop FHD', w: 1920, h: 1080 },
    { name: 'Laptop', w: 1440, h: 900 },
    { name: 'Half-Desktop', w: 820, h: 900 },
    { name: 'iPad Portrait', w: 768, h: 1024 },
    { name: 'HP Portrait Tall', w: 390, h: 844 },
    { name: 'HP Portrait Compact', w: 375, h: 667 },
    { name: 'HP Landscape', w: 844, h: 390 },
  ];

  for (const vp of viewports) {
    const g = computeResponsiveIntroGrid(vp.w, vp.h);
    assert.ok(g.totalCells >= 6 && g.totalCells <= 12, `${vp.name}: totalCells=${g.totalCells} out of [6..12]`);
    assert.ok(
      g.activeVideoCount >= g.totalCells && g.activeVideoCount <= 15,
      `${vp.name}: activeVideoCount=${g.activeVideoCount} must cover all ${g.totalCells} nodes uniquely (<=15)`
    );
    const cellAspect = (vp.w / g.cols) / (vp.h / g.rows);
    assert.ok(
      cellAspect >= 0.95,
      `${vp.name}: cell aspect ${cellAspect.toFixed(2)} feels too portrait (cols=${g.cols}, rows=${g.rows})`
    );
  }
});

test('computeCoverCropRect preserves 16:9 car video proportions without stretching', () => {
  // 16:9 video into 1:1 square cell -> horizontal center crop
  const sq = computeCoverCropRect(480, 270, 200, 200);
  assert.equal(sq.sy, 0);
  assert.equal(sq.sh, 270);
  assert.equal(Math.round(sq.sw), 270);
  assert.equal(Math.round(sq.sx), 105);

  // 16:9 video into ultra-wide 2.4:1 cell -> vertical center crop
  const wide = computeCoverCropRect(480, 270, 480, 200);
  assert.equal(wide.sx, 0);
  assert.equal(wide.sw, 480);
  assert.equal(Math.round(wide.sh), 200);
  assert.equal(Math.round(wide.sy), 35);
});

test('LandingNeedHelpSection removes cokineed_hp, enlarges camera_hp +28%, and keeps Desktop Subtitute intact', () => {
  const src = fs.readFileSync(
    path.join(FE_ROOT, 'components/landing/sections/LandingNeedHelpSection.jsx'),
    'utf8'
  );
  assert.equal(src.includes('cokineed_hp'), false, 'cokineed_hp (orang mangap) must be removed');
  assert.equal(src.includes('/hp/camera_hp.webp'), true, 'camera_hp must remain on HP family');
  assert.equal(src.includes('w-[230px] xs:w-[256px] sm:w-[294px]'), true, 'camera_hp must be enlarged +28%');
  assert.equal(src.includes('/Subtitute_NeedOurHelp.webp'), true, 'Desktop/iPad Subtitute graphic must stay untouched');
});

test('SeeEvent purges coki_event character and its white L-border across all device families', () => {
  const src = fs.readFileSync(path.join(FE_ROOT, 'components/SeeEvent.jsx'), 'utf8');
  assert.equal(src.includes('coki_event'), false, 'coki_event must be completely purged from SeeEvent');
  assert.equal(src.includes('w-[4px] h-[50%] bg-white'), false, 'white vertical L-border must be purged');
  assert.equal(src.includes('h-[4px] w-full bg-white'), false, 'white horizontal L-border must be purged');
  assert.equal(src.includes('SEE EVENT'), true, 'SEE EVENT hero title must stay intact');
});

test('IntroPreloader renders car collage on all devices, pre-warms HP K-silhouette with >=3s slack, and slows ONLY desktop title Marvel zoom by 50%', () => {
  const src = fs.readFileSync(path.join(FE_ROOT, 'components/IntroPreloader.jsx'), 'utf8');
  assert.equal(src.includes('useReducedMotion'), true, 'must respect prefers-reduced-motion');
  assert.equal(src.includes('1.2'), true, 'must start title fade-in at 120% scale');
  assert.equal(src.includes('minHeight: "92px"'), true, 'must reserve vertical frame above WakingUpText');
  assert.equal(src.includes('marginTop: "24px"'), true, 'must preserve clear gap above WakingUpText');
  assert.equal(src.includes('<WakingUpText />'), true, 'WakingUpText must remain intact on desktop');
  assert.equal(src.includes('MOBILE_K_CLIP_PATH'), true, 'Mobile/other devices must render responsive car collage');
  assert.equal(src.includes('waitForIntroVideoPoolReady'), true, 'Mobile intro must wait for decoded K-silhouette video frames before revealing');
  assert.equal(src.includes('preloadAndDecodeImage'), true, 'Mobile intro must decode HP logo before revealing');
  assert.equal(src.includes('{!isMobile && (\n        <div className="absolute inset-0 z-0'), false, 'Car collage must not be desktop-only');

  // Verify >= 3s extra hold padding on HP intro (old window = 2500ms, new >= 5500ms)
  assert.ok(
    INTRO_TIMELINE.mobile.visibleHoldMs - 2500 >= 3000,
    `Expected >=3000ms extra hold on mobile intro, got +${INTRO_TIMELINE.mobile.visibleHoldMs - 2500}ms`
  );
  // Non-desktop Marvel zoom duration unchanged (1.15s)
  assert.equal(INTRO_TIMELINE.mobile.logoZoomDurationSec, 1.15);
  // Desktop Marvel zoom slowed by exact 50% speed (1.4s -> 2.8s), all other desktop timings unchanged
  assert.equal(INTRO_TIMELINE.desktop.logoZoomDurationSec, 2.8);
  assert.equal(INTRO_TIMELINE.desktop.logoStartMs, 1000);
  assert.equal(INTRO_TIMELINE.desktop.subtitleStartMs, 2500);
  assert.equal(INTRO_TIMELINE.desktop.laserStartMs, 9500);
  assert.equal(INTRO_TIMELINE.desktop.collageFadeDurationSec, 2.6);
  assert.equal(INTRO_TIMELINE.desktop.subtitleFadeDurationSec, 0.8);
});

test('Intro preloader assigns strictly unique videos per node across initial render, resize, and swaps (zero duplicate fallback)', () => {
  let seed = 13;
  const rng = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  for (const [w, h] of [[1920, 1080], [820, 900], [768, 1024], [390, 844], [844, 390]]) {
    const g = computeResponsiveIntroGrid(w, h);
    let assigned = assignUniqueNodeVideos(g.totalCells, g.activeVideoCount, rng);
    assert.equal(assigned.length, g.totalCells);
    assert.equal(new Set(assigned).size, g.totalCells, `${w}x${h}: initial assignments must have zero duplicates`);

    for (let step = 0; step < 20; step++) {
      const cellIdx = step % g.totalCells;
      assigned = swapNodeWithUnusedVideo(assigned, cellIdx, g.activeVideoCount, rng);
      assert.equal(new Set(assigned).size, g.totalCells, `${w}x${h} step ${step}: swap introduced duplicate video`);
    }
  }

  const canvasSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/preloader/MCUVideoGridCanvas.jsx'),
    'utf8'
  );
  assert.equal(canvasSrc.includes('assignUniqueNodeVideos'), true, 'MCUVideoGridCanvas must use assignUniqueNodeVideos');
  assert.equal(canvasSrc.includes('swapNodeWithUnusedVideo'), true, 'MCUVideoGridCanvas must use swapNodeWithUnusedVideo');
  assert.equal(
    canvasSrc.includes('videos.find((vid) => vid && vid.readyState >= 2)'),
    false,
    'MCUVideoGridCanvas must NOT paste a duplicate fallback video into unready cells'
  );
});

test('About Us VideoCollage prepares instantly in-place, preserves glow fallback, and assigns strictly unique videos per node', () => {
  assert.equal(ABOUT_VIDEOS.length, 8);
  assert.equal(new Set(ABOUT_VIDEOS).size, 8);

  const desktopPick = assignDistinctAboutVideos(8, ABOUT_VIDEOS, () => 0.37);
  assert.equal(desktopPick.length, 8);
  assert.equal(new Set(desktopPick).size, 8);

  const mobilePick = assignDistinctAboutVideos(4, ABOUT_VIDEOS, () => 0.61);
  assert.equal(mobilePick.length, 4);
  assert.equal(new Set(mobilePick).size, 4);

  const activeSet = new Set(mobilePick);
  const rotated = pickNextDistinctAboutVideo(mobilePick[0], activeSet, ABOUT_VIDEOS, () => 0.25);
  assert.equal(activeSet.has(rotated), false, 'Rotated About Us clip must not collide with active sibling nodes');

  const collageSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/about/collage.jsx'),
    'utf8'
  );
  assert.equal(collageSrc.includes('450 + index * 180'), false, 'Artificial stagger mount delay must be removed');
  assert.equal(collageSrc.includes('preload="auto"'), true, 'About Us videos must prepare immediately in-place');
  assert.equal(collageSrc.includes('rootMargin: "900px 0px"'), true, 'About Us videos must pre-warm smoothly before scroll');
  assert.equal(collageSrc.includes('glowColor'), true, 'Traffic-light glow fallback must stay intact underneath videos');
  assert.equal(collageSrc.includes('assignDistinctAboutVideos'), true, 'VideoCollage must assign strictly distinct videos');
  assert.equal(collageSrc.includes('pickNextDistinctAboutVideo'), true, 'VideoCollage must rotate without sibling duplicates');
});

test('DungeonGate purges dgf_2 face, animates LOGIN FIRST with Picture 1 font, and binds event status dot to hasActiveEvent (not attempt)', () => {
  const gateSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/landing/modals/DungeonGate.jsx'),
    'utf8'
  );
  assert.equal(gateSrc.includes('/dgf_2.webp'), false, 'dgf_2 face must be purged from DungeonGate');
  assert.equal(gateSrc.includes('font-extrabold uppercase tracking-wide'), true, 'LOGIN FIRST must use Picture 1 bold sans uppercase font');
  assert.equal(gateSrc.includes('LOGIN FIRST'), true, 'LOGIN FIRST label must be present');
  assert.equal(gateSrc.includes('typedChars'), true, 'LOGIN FIRST must animate via typing effect');
  assert.equal(gateSrc.includes('/minigame/status'), true, 'DungeonGate must query /minigame/status for active event indicator');
  assert.equal(gateSrc.includes('data-dungeon-event-dot'), true, 'DungeonGate must expose event indicator dot');
  assert.equal(gateSrc.includes('hasActiveEvent'), true, 'DungeonGate dot must be driven strictly by hasActiveEvent');
  assert.equal(gateSrc.includes('isLocked = false'), false, 'Hardcoded dummy lock flag must not exist');
});

