import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../lib/prisma.js';
import { installInMemorySocialHarness } from './helpers/inMemorySocialHarness.mjs';
import {
  getActiveMinigameTargetEvent,
  getMinigameTargetInfo,
  getUserTargetStats,
  SEVEN_DAYS_SECONDS,
} from '../controllers/minigame/minigameTargetService.js';
import {
  createEvent,
  updateEvent,
  setEventTarget,
} from '../controllers/adminEventController.js';
import {
  getMinigameStatus,
  recordMinigameScore,
  clearMinigameMemStoreForTesting,
  getWibDateInfo,
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

describe('Minigame Target Event Pipeline, Countdown & Score Reset Lifecycle', () => {
  const testEventId1 = 'evt-test-target-001';
  const testEventId2 = 'evt-test-target-002';
  const testUserId = 'test-target-user-001';
  const testEmail = 'user:test-target-user-001';
  const { dateStr } = getWibDateInfo();

  let harness = null;

  beforeEach(() => {
    clearMinigameMemStoreForTesting();
    harness = installInMemorySocialHarness();
  });

  afterEach(() => {
    harness?.restore();
    harness = null;
  });

  it('correctly sets isMinigameTarget via createEvent and updateEvent and unsets previous targets', async () => {
    // 1. Create first target event (close date in 10 days)
    const now = new Date();
    const future10Days = new Date(now.getTime() + 10 * 86400 * 1000);
    const future3Days = new Date(now.getTime() + 3 * 86400 * 1000);

    await prisma.event.create({
      data: {
        id: testEventId1,
        title: 'Social Cult Grand Prix',
        displayPhotoUrl: '/test-event.jpg',
        regStartTime: now,
        regEndTime: future10Days,
        sessionOptions: ['Morning', 'Afternoon'],
        price: 50000,
        quota: 50,
        status: 'OPEN',
        isMinigameTarget: true,
        targetAssignedAt: now,
      },
    });

    const activeTarget1 = await getActiveMinigameTargetEvent();
    assert.ok(activeTarget1);
    assert.equal(activeTarget1.id, testEventId1);
    assert.equal(activeTarget1.isTarget, true);
    assert.equal(activeTarget1.isWithin7Days, false); // 10 days > 7 days

    const info1 = await getMinigameTargetInfo();
    assert.equal(info1.hasTarget, true);
    assert.equal(info1.dueStatus, 'NOT_STARTED'); // Not within 7 days

    // 2. Assign second target event via updateEvent (close date in 3 days)
    await prisma.event.create({
      data: {
        id: testEventId2,
        title: 'Neon Drift Festival',
        displayPhotoUrl: '/test-event-2.jpg',
        regStartTime: now,
        regEndTime: future3Days,
        sessionOptions: ['Night'],
        price: 75000,
        quota: 100,
        status: 'OPEN',
        isMinigameTarget: false,
      },
    });

    const reqUpdate = {
      params: { id: testEventId2 },
      body: { isTarget: true },
    };
    const resUpdate = createMockRes();
    await updateEvent(reqUpdate, resUpdate, () => {});

    assert.equal(resUpdate.statusCode, 200);
    assert.equal(resUpdate.body.event.isTarget, true);
    assert.equal(resUpdate.body.event.isMinigameTarget, true);

    // Verify first event target flag was unset
    const oldEvent = await prisma.event.findUnique({ where: { id: testEventId1 } });
    assert.equal(oldEvent.isMinigameTarget, false);

    // Verify second event is now the active target within 7 days
    const activeTarget2 = await getActiveMinigameTargetEvent();
    assert.ok(activeTarget2);
    assert.equal(activeTarget2.id, testEventId2);
    assert.equal(activeTarget2.isWithin7Days, true); // 3 days <= 7 days

    const info2 = await getMinigameTargetInfo();
    assert.equal(info2.hasTarget, true);
    assert.equal(info2.dueStatus, 'COUNTDOWN'); // Within 7 days
    assert.ok(info2.secondsUntilDue > 0 && info2.secondsUntilDue <= SEVEN_DAYS_SECONDS);
  });

  it('recognizes target expiration when close registration date has passed and resets status to NOT_STARTED', async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 10000); // 10 seconds ago

    await prisma.event.create({
      data: {
        id: testEventId1,
        title: 'Expired Automotive Meetup',
        displayPhotoUrl: '/test-expired.jpg',
        regStartTime: new Date(now.getTime() - 86400000),
        regEndTime: pastDate,
        sessionOptions: ['All Day'],
        price: 0,
        quota: 10,
        status: 'OPEN',
        isMinigameTarget: true,
        targetAssignedAt: new Date(now.getTime() - 86400000),
      },
    });

    // Active target should be null because assign time ended
    const activeTarget = await getActiveMinigameTargetEvent();
    assert.equal(activeTarget, null);

    const info = await getMinigameTargetInfo();
    assert.equal(info.hasTarget, false);
    assert.equal(info.dueStatus, 'NOT_STARTED');
    assert.equal(info.secondsUntilDue, null);
  });

  it('resets user score to default (null) when target event changes or expires', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 5 * 86400 * 1000);

    // 1. Assign Event 1
    const event1 = await prisma.event.create({
      data: {
        id: testEventId1,
        title: 'Target Season 1',
        displayPhotoUrl: '/target-1.jpg',
        regStartTime: now,
        regEndTime: futureDate,
        sessionOptions: ['Main'],
        price: 10000,
        quota: 50,
        status: 'OPEN',
        isMinigameTarget: true,
        targetAssignedAt: now,
      },
    });

    // 2. User plays and records score 12000ms
    const reqPlay = {
      user: { userId: testUserId, email: testEmail, role: 'USER' },
      headers: { 'x-client-fingerprint': 'target-user-fp' },
      ip: '127.0.0.1',
      body: { ms: 12000, seed: 'seed-target-1' },
    };
    const resPlay = createMockRes();
    await recordMinigameScore(reqPlay, resPlay, () => {});
    assert.equal(resPlay.statusCode, 201);
    assert.equal(resPlay.body.targetEvent.id, testEventId1);

    // 3. User stats for Event 1 reflects best score 12000ms
    const activeTarget1 = await getActiveMinigameTargetEvent();
    const stats1 = await getUserTargetStats(testUserId, testEmail, activeTarget1, dateStr);
    assert.equal(stats1.bestScoreMs, 12000);
    assert.equal(stats1.totalPlays, 1);

    // 4. Now assign Event 2 as the new target
    await prisma.event.create({
      data: {
        id: testEventId2,
        title: 'Target Season 2',
        displayPhotoUrl: '/target-2.jpg',
        regStartTime: now,
        regEndTime: futureDate,
        sessionOptions: ['Main'],
        price: 15000,
        quota: 50,
        status: 'OPEN',
        isMinigameTarget: false,
      },
    });
    const reqSetTarget = {
      params: { id: testEventId2 },
      body: { isTarget: true },
    };
    const resSetTarget = createMockRes();
    await setEventTarget(reqSetTarget, resSetTarget, () => {});
    assert.equal(resSetTarget.statusCode, 200);

    // 5. Active target is now Event 2. User stats for Event 2 MUST be reset to default (null)!
    const activeTarget2 = await getActiveMinigameTargetEvent();
    assert.equal(activeTarget2.id, testEventId2);

    const stats2 = await getUserTargetStats(testUserId, testEmail, activeTarget2, dateStr);
    assert.equal(stats2.bestScoreMs, null, 'Scores must be reset to default when target changes');
    assert.equal(stats2.totalPlays, 0, 'No plays should be inherited from previous target event');

    // 6. getMinigameStatus endpoint reflects reset scores
    const reqStatus = {
      user: { userId: testUserId, email: testEmail, role: 'USER' },
      headers: { 'x-client-fingerprint': 'target-user-fp' },
      ip: '127.0.0.1',
    };
    const resStatus = createMockRes();
    await getMinigameStatus(reqStatus, resStatus, () => {});
    assert.equal(resStatus.statusCode, 200);
    assert.equal(resStatus.body.stats.bestScoreMs, null);
    assert.equal(resStatus.body.targetEvent.id, testEventId2);
  });
});
