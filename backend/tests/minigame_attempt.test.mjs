import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMinigameStatus,
  recordMinigameScore,
  getWibDateInfo,
  clearMinigameMemStoreForTesting,
} from '../controllers/minigameController.js';
import { installInMemorySocialHarness } from './helpers/inMemorySocialHarness.mjs';

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

  let harness = null;

  beforeEach(() => {
    clearMinigameMemStoreForTesting();
    const now = Date.now();
    harness = installInMemorySocialHarness({
      events: [
        {
          id: 'evt-active-minigame-target',
          title: 'Active 3-Day Target',
          displayPhotoUrl: '/event_1.webp',
          regStartTime: new Date(now - 86400 * 1000),
          regEndTime: new Date(now + 3 * 86400 * 1000),
          sessionOptions: ['Main'],
          price: 50000,
          quota: 50,
          status: 'OPEN',
          isMinigameTarget: true,
          targetAssignedAt: new Date(now - 3600 * 1000),
        },
      ],
    });
  });

  afterEach(() => {
    harness?.restore();
    harness = null;
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

  it('rejects recording score with 403 when no active target event countdown is running', async () => {
    harness.db.events.clear();
    const req = {
      user: { userId: testUserId, email: testEmail, role: 'USER' },
      headers: { 'x-client-fingerprint': 'test-minigame-fp-notarget' },
      ip: '127.0.0.1',
      body: { ms: 12500, seed: 'no-target-seed' },
    };
    const res = createMockRes();
    await recordMinigameScore(req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /Due countdown is active/i);
  });
});
