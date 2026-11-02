import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { redis } from '../lib/redis.js';
import prisma from '../lib/prisma.js';
import {
  getMinigameStatus,
  recordMinigameScore,
  getWibDateInfo,
  clearMinigameMemStoreForTesting,
} from '../controllers/minigameController.js';

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      headers[key.toLowerCase()] = String(val);
      return this;
    },
    getHeader(key) {
      return headers[key.toLowerCase()];
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

describe('Minigame Daily Attempt Limit & Score Recording Vertical Slice', () => {
  const testUserId = 'test-minigame-user-001';
  const testEmail = 'user:test-minigame-user-001';
  const { dateStr } = getWibDateInfo();

  beforeEach(async () => {
    clearMinigameMemStoreForTesting();
    // Clean up test keys in redis if ready
    if (redis && redis.status === 'ready') {
      try {
        await redis.del(`minigame:attempt:user:${testUserId}:${dateStr}`);
        await redis.del(`minigame:attempt:fp:test-minigame-fp:${dateStr}`);
      } catch {}
    }
    // Clean up audit logs for test user
    try {
      await prisma.auditLog.deleteMany({
        where: { adminEmail: testEmail, action: 'MINIGAME_PLAY' },
      });
    } catch {}
  });

  after(async () => {
    try {
      if (redis?.disconnect) redis.disconnect();
    } catch {}
  });

  it('calculates WIB timezone date and positive seconds until midnight', () => {
    const { dateStr, secondsUntilReset, startOfDayWib } = getWibDateInfo();
    assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(secondsUntilReset > 0 && secondsUntilReset <= 86400);
    assert.ok(startOfDayWib instanceof Date);
  });

  it('returns attempt: 1 for user who has not played today', async () => {
    const req = {
      user: { userId: testUserId, role: 'USER' },
      headers: { 'x-client-fingerprint': 'test-minigame-fp' },
      ip: '127.0.0.1',
    };
    const res = createMockRes();

    await getMinigameStatus(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.attempt, 1);
    assert.equal(res.body.hasPlayedToday, false);
    assert.ok(res.body.secondsUntilReset > 0);
  });

  it('rejects unauthenticated user attempting to record score with 401', async () => {
    const req = {
      user: null,
      headers: {},
      ip: '127.0.0.1',
      body: { ms: 14500, seed: '12345' },
    };
    const res = createMockRes();

    await recordMinigameScore(req, res, () => {});

    assert.equal(res.statusCode, 401);
    assert.match(res.body.error, /sign in/i);
  });

  it('rejects invalid score durations (< 1000ms or > 600000ms) with 400', async () => {
    const req = {
      user: { userId: testUserId, role: 'USER' },
      headers: {},
      ip: '127.0.0.1',
      body: { ms: 120, seed: '12345' }, // Too fast / impossible
    };
    const res = createMockRes();

    await recordMinigameScore(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /duration/i);
  });

  it('records score and enforces exactly 1 daily attempt per authenticated user', async () => {
    const req = {
      user: { userId: testUserId, email: testEmail, role: 'USER' },
      headers: { 'x-client-fingerprint': 'test-minigame-fp' },
      ip: '127.0.0.1',
      body: { ms: 12500, seed: 'test-seed-xyz' },
    };
    const res1 = createMockRes();

    // 1. Submit first attempt
    await recordMinigameScore(req, res1, () => {});
    assert.equal(res1.statusCode, 201);
    assert.equal(res1.body.attempt, 0);
    assert.equal(res1.body.hasPlayedToday, true);

    // 2. Status now reflects 0 attempts left
    const resStatus = createMockRes();
    await getMinigameStatus(req, resStatus, () => {});
    assert.equal(resStatus.statusCode, 200);
    assert.equal(resStatus.body.attempt, 0);
    assert.equal(resStatus.body.hasPlayedToday, true);

    // 3. Second attempt on the same day is rejected with 429
    const res2 = createMockRes();
    await recordMinigameScore(req, res2, () => {});
    assert.equal(res2.statusCode, 429);
    assert.match(res2.body.error, /Daily attempt already used/i);
  });
});
