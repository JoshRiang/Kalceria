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
} from '../components/preloader/introVideoGridLayout.js';

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
    assert.ok(g.activeVideoCount >= 4 && g.activeVideoCount <= 8, `${vp.name}: decoders=${g.activeVideoCount}`);
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

test('IntroPreloader renders car collage on all devices and Marvel 120% -> 100% shrink with WakingUpText clearance', () => {
  const src = fs.readFileSync(path.join(FE_ROOT, 'components/IntroPreloader.jsx'), 'utf8');
  assert.equal(src.includes('useReducedMotion'), true, 'must respect prefers-reduced-motion');
  assert.equal(src.includes('1.2'), true, 'must start title fade-in at 120% scale');
  assert.equal(src.includes('minHeight: "92px"'), true, 'must reserve vertical frame above WakingUpText');
  assert.equal(src.includes('marginTop: "24px"'), true, 'must preserve clear gap above WakingUpText');
  assert.equal(src.includes('<WakingUpText />'), true, 'WakingUpText must remain intact on desktop');
  assert.equal(src.includes('MOBILE_K_CLIP_PATH'), true, 'Mobile/other devices must render responsive car collage');
  assert.equal(src.includes('{!isMobile && (\n        <div className="absolute inset-0 z-0'), false, 'Car collage must not be desktop-only');
});

