import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BE_ROOT = path.resolve(__dirname, '..');
const readBe = (rel) => fs.readFileSync(path.join(BE_ROOT, rel), 'utf8');

test('Canonical store isolates chat_rtc signals from voice/video call signals without schema drift', () => {
  const storeSrc = readBe('services/canonicalFallbackStore.js');
  assert.ok(storeSrc.includes("export async function storeCanonicalChatRtcSignal"), 'Must export storeCanonicalChatRtcSignal');
  assert.ok(storeSrc.includes("export async function fetchCanonicalChatRtcSignals"), 'Must export fetchCanonicalChatRtcSignals');
  assert.ok(
    storeSrc.includes("NOT: { callId: { startsWith: 'chat_rtc:' } }"),
    'Voice/video call signal fetches must exclude chat_rtc namespace'
  );
  assert.ok(
    storeSrc.includes("callId: `chat_rtc:${String(convHash)}`"),
    'Chat P2P WebRTC signals must be namespaced under chat_rtc:<convHash>'
  );
});

test('Chat P2P WebRTC signaling & message queries survive degraded Redis across stateless serverless lambdas', () => {
  const rtcSrc = readBe('controllers/personalChat/chatRtcController.js');
  const querySrc = readBe('controllers/personalChat/chatMessageQuery.js');
  const callSrc = readBe('controllers/personalChat/callSignalController.js');
  const inboxSrc = readBe('controllers/personalChat/chatInboxController.js');

  // Chat RTC controller writes & reads canonical Postgres fallback
  assert.ok(rtcSrc.includes('storeCanonicalChatRtcSignal'), 'sendChatRtcSignal must persist to shared Postgres store');
  assert.ok(rtcSrc.includes('fetchCanonicalChatRtcSignals'), 'getChatRtcSignals must hydrate from shared Postgres store');

  // Chat message query never short-circuits on stale per-lambda RAM when Redis is degraded
  assert.ok(querySrc.includes('const redisDegraded = Boolean(redis.isDegraded || redis.isQuotaExceeded)'), 'chatMessageQuery must detect degraded Redis');
  assert.ok(querySrc.includes('!redisDegraded &&'), 'O(1) Delta Short-Circuit must bypass stale RAM when Redis is degraded');
  assert.ok(querySrc.includes('fetchCanonicalChatRtcSignals'), 'Piggybacked includeRtc must also deliver canonical Postgres WebRTC signals');

  // Call signaling always merges canonical Postgres signals when Redis is degraded
  assert.ok(callSrc.includes('if (redisDegraded || signals.length === 0)'), 'getCallSignals must merge Postgres signals when Redis is degraded');
  assert.ok(callSrc.includes('getCanonicalCallLock(targetId)'), 'sendCallSignal must verify canonical call lock when Redis is degraded');

  // Inbox summary never short-circuits on stale per-lambda RAM version when Redis is degraded
  assert.ok(inboxSrc.includes('if (!redisDegraded && sinceVer'), 'Inbox summary must bypass stale RAM version when Redis is degraded');

  // Unified mid-call Voice->Video WebRTC renegotiation signal types
  assert.ok(callSrc.includes("'renegotiate_offer'"), 'Backend call signaling must accept mid-call renegotiate_offer');
  assert.ok(callSrc.includes("'renegotiate_answer'"), 'Backend call signaling must accept mid-call renegotiate_answer');
});

