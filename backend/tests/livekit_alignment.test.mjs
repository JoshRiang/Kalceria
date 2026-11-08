import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis.js';
import { generateLiveKitToken } from '../controllers/personalChat/callSignalController.js';

test('LiveKit Token Alignment & Harmonization Suite', async (t) => {
  after(async () => {
    await redis.quit().catch(() => {});
  });
  await t.test('1. Gracefully returns null when credentials are missing', () => {
    const origUrl = process.env.LIVEKIT_URL;
    const origKey = process.env.LIVEKIT_API_KEY;
    const origSecret = process.env.LIVEKIT_API_SECRET;

    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;

    const res = generateLiveKitToken({
      userId: 'user_alpha',
      targetId: 'user_beta',
      username: 'alpha',
    });
    assert.equal(res, null, 'Must return null without throwing when credentials missing');

    // Restore
    if (origUrl) process.env.LIVEKIT_URL = origUrl;
    if (origKey) process.env.LIVEKIT_API_KEY = origKey;
    if (origSecret) process.env.LIVEKIT_API_SECRET = origSecret;
  });

  await t.test('2. Generates RFC 7519 compliant LiveKit JWT with room permissions', () => {
    const testKey = 'test_api_key_123';
    const testSecret = 'test_api_secret_very_secret_99999999999999';
    const testUrl = 'wss://kalceria-test.livekit.cloud';

    const origUrl = process.env.LIVEKIT_URL;
    const origKey = process.env.LIVEKIT_API_KEY;
    const origSecret = process.env.LIVEKIT_API_SECRET;

    process.env.LIVEKIT_URL = testUrl;
    process.env.LIVEKIT_API_KEY = testKey;
    process.env.LIVEKIT_API_SECRET = testSecret;

    try {
      const res = generateLiveKitToken({
        userId: 'user_456',
        targetId: 'user_789',
        username: 'reinathan',
        callId: 'call_custom_test_id',
      });

      assert.ok(res, 'Must return token result object');
      assert.equal(res.url, testUrl);
      assert.equal(res.room, 'call_custom_test_id');
      assert.equal(res.identity, 'user_456');
      assert.ok(typeof res.token === 'string' && res.token.length > 20);

      // Verify cryptographic validity with HS256
      const decoded = jwt.verify(res.token, testSecret, { algorithms: ['HS256'] });
      assert.equal(decoded.iss, testKey);
      assert.equal(decoded.sub, 'user_456');
      assert.equal(decoded.name, 'reinathan');
      assert.ok(decoded.exp > decoded.iat, 'Token must have future expiry');
      assert.deepEqual(decoded.video, {
        room: 'call_custom_test_id',
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
    } finally {
      process.env.LIVEKIT_URL = origUrl;
      process.env.LIVEKIT_API_KEY = origKey;
      process.env.LIVEKIT_API_SECRET = origSecret;
    }
  });

  await t.test('3. Generates deterministic sorted room name when callId is omitted', () => {
    const testKey = 'test_api_key_123';
    const testSecret = 'test_api_secret_very_secret_99999999999999';
    const testUrl = 'wss://kalceria-test.livekit.cloud';

    const origUrl = process.env.LIVEKIT_URL;
    const origKey = process.env.LIVEKIT_API_KEY;
    const origSecret = process.env.LIVEKIT_API_SECRET;

    process.env.LIVEKIT_URL = testUrl;
    process.env.LIVEKIT_API_KEY = testKey;
    process.env.LIVEKIT_API_SECRET = testSecret;

    try {
      const resA = generateLiveKitToken({ userId: 'user_zzz', targetId: 'user_aaa' });
      const resB = generateLiveKitToken({ userId: 'user_aaa', targetId: 'user_zzz' });

      assert.equal(resA.room, 'call_user_aaa_user_zzz');
      assert.equal(resB.room, 'call_user_aaa_user_zzz');
      assert.equal(resA.room, resB.room, 'Both caller and callee must derive identical room name');
    } finally {
      process.env.LIVEKIT_URL = origUrl;
      process.env.LIVEKIT_API_KEY = origKey;
      process.env.LIVEKIT_API_SECRET = origSecret;
    }
  });
});
