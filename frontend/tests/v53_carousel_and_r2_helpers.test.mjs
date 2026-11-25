import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CHAT_BG_CDN_BASE,
  CHAT_BG_CAROUSEL_SLIDES,
  normalizeChatBgSlideIndex,
  getNextChatBgSlideIndex,
  pickRandomChatBgSlideIndex,
  getChatBgSlideUrl,
} from '../components/map/chat/components/chatBackgroundCarousel.js';
import {
  MAP_BG_CDN_BASE,
  MAP_BG_WEBP_ASSETS,
  resolveLocalMapBgFallback,
} from '../lib/mapBgCache.js';
import { isKalceriaManagedMediaUrl } from '../lib/mediaUploadHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.resolve(__dirname, '..');

test('Chat Box background carousel provides 5 distinct Nongskuy CDN slides with uniform 1/5 random selector and zero dot switcher', () => {
  assert.equal(CHAT_BG_CAROUSEL_SLIDES.length, 5);
  const darkSet = new Set(CHAT_BG_CAROUSEL_SLIDES.map((s) => s.dark));
  const lightSet = new Set(CHAT_BG_CAROUSEL_SLIDES.map((s) => s.light));
  assert.equal(darkSet.size, 5);
  assert.equal(lightSet.size, 5);

  for (const slide of CHAT_BG_CAROUSEL_SLIDES) {
    assert.equal(slide.dark.startsWith(`${CHAT_BG_CDN_BASE}/`), true);
    assert.equal(slide.light.startsWith(`${CHAT_BG_CDN_BASE}/`), true);
    const darkPath = path.join(FE_ROOT, 'public', slide.localDark);
    const lightPath = path.join(FE_ROOT, 'public', slide.localLight);
    assert.equal(fs.existsSync(darkPath), true, `Missing local fallback asset: ${darkPath}`);
    assert.equal(fs.existsSync(lightPath), true, `Missing local fallback asset: ${lightPath}`);
    assert.equal(resolveLocalMapBgFallback(slide.dark), slide.localDark);
    assert.equal(resolveLocalMapBgFallback(slide.light), slide.localLight);
  }

  assert.equal(normalizeChatBgSlideIndex(-1), 4);
  assert.equal(normalizeChatBgSlideIndex(5), 0);
  assert.equal(normalizeChatBgSlideIndex(NaN), 0);
  assert.equal(getNextChatBgSlideIndex(4, 1), 0);
  assert.equal(getNextChatBgSlideIndex(0, -1), 4);
  assert.match(getChatBgSlideUrl(2, true), /BG_PersonalChat_3_Dark\.webp/);
  assert.match(getChatBgSlideUrl(2, false), /BG_PersonalChat_3_Light\.webp/);

  // Uniform 1/5 probability mapping across [0..4]
  assert.equal(pickRandomChatBgSlideIndex(5, () => 0.0), 0);
  assert.equal(pickRandomChatBgSlideIndex(5, () => 0.2), 1);
  assert.equal(pickRandomChatBgSlideIndex(5, () => 0.4), 2);
  assert.equal(pickRandomChatBgSlideIndex(5, () => 0.6), 3);
  assert.equal(pickRandomChatBgSlideIndex(5, () => 0.8), 4);
  assert.equal(pickRandomChatBgSlideIndex(5, () => 0.99999), 4);

  // Thread component must have zero manual dot switcher and zero auto-rotate interval
  const threadSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/map/chat/components/ChatMessageThread.jsx'),
    'utf8'
  );
  assert.equal(threadSrc.includes('pickRandomChatBgSlideIndex'), true);
  assert.equal(threadSrc.includes('Switch chat background'), false);
  assert.equal(threadSrc.includes('CHAT_BG_AUTO_ROTATE_MS'), false);
  assert.equal(threadSrc.includes('CHAT_BG_STORAGE_KEY'), false);

  // All 24 Map UI background assets use Cloudflare Edge CDN + resolve cleanly to existing local fallback files
  assert.equal(MAP_BG_WEBP_ASSETS.length, 24);
  for (const url of MAP_BG_WEBP_ASSETS) {
    assert.equal(url.startsWith(`${MAP_BG_CDN_BASE}/`), true, `Expected Cloudflare CDN URL: ${url}`);
    const localRel = resolveLocalMapBgFallback(url);
    assert.equal(fs.existsSync(path.join(FE_ROOT, 'public', localRel)), true, `Missing local fallback: ${localRel}`);
  }
});

test('isKalceriaManagedMediaUrl recognizes Cloudflare R2 & legacy Blob URLs and rejects third-party hosts', () => {
  assert.equal(isKalceriaManagedMediaUrl('https://cdn.kalceria.id/event-clips/2026-11-25/clip.mp4'), true);
  assert.equal(isKalceriaManagedMediaUrl('https://media.kalceria.id/avatars/a.webp'), true);
  assert.equal(isKalceriaManagedMediaUrl('https://pub-1234.r2.dev/chat/v.webm'), true);
  assert.equal(isKalceriaManagedMediaUrl('/api/blob/raw?url=https%3A%2F%2Fcdn.kalceria.id%2Fa.jpg'), true);
  assert.equal(isKalceriaManagedMediaUrl('https://evil.example.com/clip.mp4'), false);
  assert.equal(isKalceriaManagedMediaUrl(''), false);
});

test('Voice Note removes Coki mascot & lip-sync helper while preserving core playback & scrubbing', () => {
  const src = fs.readFileSync(
    path.join(FE_ROOT, 'components/map/chat/components/messageBubble/ChatVoiceNoteBubble.jsx'),
    'utf8'
  );
  assert.equal(src.includes('Coki_Speak'), false);
  assert.equal(src.includes('Coki_Idle'), false);
  assert.equal(src.includes('isSpeakingNow'), false);
  assert.equal(src.includes('getOrCreateAudio'), true);
  assert.equal(src.includes('handlePointerDownWaveform'), true);
  assert.equal(src.includes('handleSeekRatio'), true);
  assert.equal(src.includes('displayWaveform'), true);
});

test('Event Box removes header blur, Edit Profile uses solid red trash fill, Voice Call replaces Coki only', () => {
  const popupSrc = fs.readFileSync(path.join(FE_ROOT, 'components/map/EventPopup.jsx'), 'utf8');
  const headerLine = popupSrc.split('\n').find((l) => l.includes('class="popup-profile"')) || '';
  assert.equal(headerLine.includes('backdrop-filter'), false);
  assert.equal(popupSrc.includes('class="popup-footer-fade"'), true, 'EventPopup must seamlessly fade background into footer');

  const socialSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/map/editProfile/EditProfileSocialFields.jsx'),
    'utf8'
  );
  const redFillMatches = socialSrc.match(/fill="#ef4444"/g) || [];
  assert.equal(redFillMatches.length, 2, 'Both WhatsApp and Instagram trash icons must use full solid red fill');
  assert.equal(socialSrc.includes('EditProfileActionBackdrop'), false, 'Trashcan icons must NOT have blur box backdrop');

  const dangerSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/map/editProfile/EditProfileDangerZone.jsx'),
    'utf8'
  );
  const dangerBackdropMatches = dangerSrc.match(/<EditProfileActionBackdrop/g) || [];
  assert.equal(dangerBackdropMatches.length, 2, 'Both Change Password and Delete Account must render seamless blur backdrop');

  const callStageSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/map/chat/call/CallMediaStage.jsx'),
    'utf8'
  );
  assert.equal(callStageSrc.includes('BackgroundVoiceTrimmed'), false);
  assert.equal(callStageSrc.includes('VOICE_CALL_BG_DARK'), true);
  assert.equal(callStageSrc.includes('mode === "video"'), true);

  const incomingSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/map/chat/components/IncomingCallModal.jsx'),
    'utf8'
  );
  assert.equal(incomingSrc.includes('BackgroundVoiceTrimmed'), false);
  assert.equal(incomingSrc.includes('VOICE_CALL_BG_DARK'), true);

  const editBgSrc = fs.readFileSync(
    path.join(FE_ROOT, 'components/map/editProfile/EditProfileCokiBackground.jsx'),
    'utf8'
  );
  assert.equal(editBgSrc.includes('CokiEditProfile'), false);
  assert.equal(editBgSrc.includes('EDIT_PROFILE_BG_DARK'), true);
});

