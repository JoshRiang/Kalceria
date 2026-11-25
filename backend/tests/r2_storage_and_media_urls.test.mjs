import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { redis } from '../lib/redis.js';
import { sanitizeAndNormalizeMediaUrl } from '../utils/urlSecurity.js';
import { resolveEmailPosterUrl } from '../lib/mailer/emailUtils.js';
import { inferIsVideoUrl } from '../controllers/miniEvent/eventMediaStore.js';
import { extractUrlsFromLegacyMediaString } from '../controllers/miniEvent/eventFormatting.js';
import { isR2Configured, putR2Object } from '../lib/r2Storage.js';

after(() => {
  try {
    redis.disconnect?.();
  } catch {}
});

test('urlSecurity accepts Cloudflare R2 CDN direct & proxy URLs and preserves SSRF/traversal defenses', () => {
  const directMp4 = sanitizeAndNormalizeMediaUrl('https://cdn.kalceria.id/event-clips/2026-11-25/demo.mp4');
  assert.equal(directMp4.valid, true);
  assert.equal(directMp4.normalized, 'https://cdn.kalceria.id/event-clips/2026-11-25/demo.mp4');

  const directWebp = sanitizeAndNormalizeMediaUrl('https://cdn.kalceria.id/comments/123-photo.webp');
  assert.equal(directWebp.valid, true);

  const proxied = sanitizeAndNormalizeMediaUrl(
    '/api/blob/raw?url=' + encodeURIComponent('https://cdn.kalceria.id/chat/123-clip.mp4')
  );
  assert.equal(proxied.valid, true);

  const blockedLocal = sanitizeAndNormalizeMediaUrl('https://127.0.0.1/evil.mp4');
  assert.equal(blockedLocal.valid, false);

  const blockedProxyHost = sanitizeAndNormalizeMediaUrl(
    '/api/blob/raw?url=' + encodeURIComponent('https://evil.example.com/a.mp4')
  );
  assert.equal(blockedProxyHost.valid, false);

  const blockedExt = sanitizeAndNormalizeMediaUrl('https://cdn.kalceria.id/comments/payload.html');
  assert.equal(blockedExt.valid, false);
});

test('resolveEmailPosterUrl preserves external R2 .webp URLs while converting local Kalceria .webp posters to .jpg', () => {
  const r2Poster = resolveEmailPosterUrl({
    displayPhotoUrl: 'https://cdn.kalceria.id/admin-events/poster.webp',
  });
  assert.equal(r2Poster, 'https://cdn.kalceria.id/admin-events/poster.webp?v=kalceria');

  const localPoster = resolveEmailPosterUrl({
    displayPhotoUrl: '/event_1.webp',
  });
  assert.equal(localPoster, 'https://www.kalceria.id/event_1.jpg?v=kalceria');
});

test('inferIsVideoUrl detects mobile and desktop video extensions on Cloudflare R2 URLs', () => {
  assert.equal(inferIsVideoUrl('https://cdn.kalceria.id/event-clips/clip.mov'), true);
  assert.equal(inferIsVideoUrl('https://cdn.kalceria.id/event-clips/clip.m4v'), true);
  assert.equal(inferIsVideoUrl('https://cdn.kalceria.id/event-clips/clip.3gp'), true);
  assert.equal(inferIsVideoUrl('https://cdn.kalceria.id/event-clips/clip.mp4'), true);
  assert.equal(inferIsVideoUrl('https://cdn.kalceria.id/event-clips/photo.webp'), false);
});

test('extractUrlsFromLegacyMediaString extracts embedded 13-digit upload timestamps from R2 event-clip URLs', () => {
  const ts = 1_795_628_123_456;
  const r2Url = `https://cdn.kalceria.id/event-clips/2026-11-26/${ts}-ab12cd34-night-meet.mp4`;
  const parsed = extractUrlsFromLegacyMediaString(r2Url);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].url, r2Url);
  assert.equal(parsed[0].uploadedAt, ts);

  const untimestamped = extractUrlsFromLegacyMediaString('https://cdn.kalceria.id/event-clips/legacy-clip.mp4');
  assert.equal(untimestamped.length, 1);
  assert.equal(untimestamped[0].uploadedAt, null);
});

test('backend r2Storage puts objects cleanly through configured Gateway mode (in-memory mock fetch)', async () => {
  const origGwUrl = process.env.R2_GATEWAY_URL;
  const origGwTok = process.env.R2_GATEWAY_TOKEN;
  const origPub = process.env.R2_PUBLIC_BASE_URL;
  const origFetch = globalThis.fetch;

  let captured = null;
  try {
    process.env.R2_GATEWAY_URL = 'https://cdn.kalceria.id';
    process.env.R2_GATEWAY_TOKEN = 'test-gateway-token-value-1234567890abcdef';
    process.env.R2_PUBLIC_BASE_URL = 'https://cdn.kalceria.id';
    assert.equal(isR2Configured(), true);

    globalThis.fetch = async (url, init) => {
      captured = { url, method: init.method, auth: init.headers.Authorization, ct: init.headers['Content-Type'] };
      return new Response(JSON.stringify({ ok: true, size: 5, etag: '"abc"' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await putR2Object({
      key: 'admin-events/test.mp4',
      body: Buffer.from('hello'),
      contentType: 'video/mp4',
    });

    assert.equal(res.provider, 'cloudflare-r2');
    assert.equal(res.url, 'https://cdn.kalceria.id/admin-events/test.mp4');
    assert.equal(captured.url, 'https://cdn.kalceria.id/admin-events/test.mp4');
    assert.equal(captured.method, 'PUT');
    assert.equal(captured.ct, 'video/mp4');
    assert.equal(captured.auth, 'Bearer test-gateway-token-value-1234567890abcdef');
  } finally {
    globalThis.fetch = origFetch;
    if (origGwUrl === undefined) delete process.env.R2_GATEWAY_URL;
    else process.env.R2_GATEWAY_URL = origGwUrl;
    if (origGwTok === undefined) delete process.env.R2_GATEWAY_TOKEN;
    else process.env.R2_GATEWAY_TOKEN = origGwTok;
    if (origPub === undefined) delete process.env.R2_PUBLIC_BASE_URL;
    else process.env.R2_PUBLIC_BASE_URL = origPub;
  }
});
