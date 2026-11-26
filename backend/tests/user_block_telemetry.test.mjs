import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { redis } from '../lib/redis.js';
import {
  getBlockedUsers,
  blockUser,
  unblockUser,
} from '../controllers/telemetry/userBlockController.js';
import { isValidTargetId } from '../controllers/telemetry/telemetryUtils.js';
import { installInMemorySocialHarness } from './helpers/inMemorySocialHarness.mjs';

function createMockReq({ userId = 'user_alice_uuid', targetId = 'user_bob_uuid', body = {}, query = {}, params = {} } = {}) {
  return {
    user: userId ? { userId, id: userId, email: 'alice@example.com' } : null,
    params: { targetId, ...params },
    body,
    query,
    cookies: {},
    get: () => null,
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

describe('Wave 1: Map Core, Telemetry & User Block Subsystem', () => {
  const aliceId = 'usr_alice_12345';
  const bobId = 'usr_bob_67890';
  const charlieId = 'usr_charlie_54321';

  let harness = null;

  beforeEach(async () => {
    harness = installInMemorySocialHarness();
  });

  afterEach(() => {
    harness?.restore();
    harness = null;
  });

  describe('1. isValidTargetId Validation Engine', () => {
    it('accepts valid alphanumeric IDs, UUIDs, and usernames', () => {
      assert.equal(isValidTargetId('b918d7d7-c247-46aa-b8d7-5b218440499a', aliceId), true);
      assert.equal(isValidTargetId('monyetbabi', aliceId), true);
      assert.equal(isValidTargetId('user.123_test-name', aliceId), true);
      assert.equal(isValidTargetId('12345678', aliceId), true);
    });

    it('rejects self-block attempts where targetId === currentUserId', () => {
      assert.equal(isValidTargetId(aliceId, aliceId), false);
      assert.equal(isValidTargetId('  ' + aliceId + '  ', aliceId), false);
    });

    it('rejects empty, null, undefined, and non-string inputs', () => {
      assert.equal(isValidTargetId('', aliceId), false);
      assert.equal(isValidTargetId('   ', aliceId), false);
      assert.equal(isValidTargetId(null, aliceId), false);
      assert.equal(isValidTargetId(undefined, aliceId), false);
      assert.equal(isValidTargetId(12345, aliceId), false);
    });

    it('rejects malicious or injection characters', () => {
      assert.equal(isValidTargetId('usr<script>', aliceId), false);
      assert.equal(isValidTargetId('usr" OR 1=1', aliceId), false);
      assert.equal(isValidTargetId('usr/../../etc', aliceId), false);
    });
  });

  describe('2. Block User Controller (blockUser)', () => {
    it('rejects invalid target ID with 400', async () => {
      const req = createMockReq({ userId: aliceId, targetId: aliceId }); // self-block
      const res = createMockRes();
      await blockUser(req, res, () => {});
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /Invalid target user id/);
    });

    it('successfully persists two-way block mapping in Redis', async () => {
      const req = createMockReq({ userId: aliceId, targetId: bobId });
      const res = createMockRes();
      await blockUser(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.blockedUserId, bobId);

      const [aliceBlocked, bobBlockedBy] = await Promise.all([
        redis.smembers(`blocked:${aliceId}`),
        redis.smembers(`blocked_by:${bobId}`),
      ]);

      assert.ok(aliceBlocked.includes(bobId), 'Alice should have Bob in her blocked set');
      assert.ok(bobBlockedBy.includes(aliceId), 'Bob should have Alice in his blocked_by set');
    });

    it('clears RTC signaling keys between blocker and blocked target', async () => {
      const { getChatRtcSignalKey } = await import('../controllers/personalChat/chatConstants.js');
      const rtcKeyAliceBob = getChatRtcSignalKey(aliceId, bobId);
      const rtcKeyBobAlice = getChatRtcSignalKey(bobId, aliceId);

      await redis.set(rtcKeyAliceBob, 'signal_data');
      await redis.set(rtcKeyBobAlice, 'signal_data');

      const req = createMockReq({ userId: aliceId, targetId: bobId });
      const res = createMockRes();
      await blockUser(req, res, () => {});

      const [val1, val2] = await Promise.all([
        redis.get(rtcKeyAliceBob),
        redis.get(rtcKeyBobAlice),
      ]);
      assert.equal(val1, null);
      assert.equal(val2, null);
    });
  });

  describe('3. Get Blocked Users Controller (getBlockedUsers)', () => {
    it('returns empty lists when user has no blocked contacts', async () => {
      const req = createMockReq({ userId: aliceId });
      const res = createMockRes();
      await getBlockedUsers(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body.blockedUsers, []);
      assert.deepEqual(res.body.blockedByUsers, []);
    });

    it('returns both blockedUsers and blockedByUsers accurately', async () => {
      // Alice blocks Bob, Charlie blocks Alice
      await Promise.all([
        redis.sadd(`blocked:${aliceId}`, bobId),
        redis.sadd(`blocked_by:${bobId}`, aliceId),
        redis.sadd(`blocked:${charlieId}`, aliceId),
        redis.sadd(`blocked_by:${aliceId}`, charlieId),
      ]);

      const req = createMockReq({ userId: aliceId });
      const res = createMockRes();
      await getBlockedUsers(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.ok(res.body.blockedUsers.includes(bobId));
      assert.ok(res.body.blockedByUsers.includes(charlieId));
    });

    it('handles unauthenticated requests gracefully', async () => {
      const req = { user: null };
      const res = createMockRes();
      await getBlockedUsers(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body.blockedUsers, []);
      assert.deepEqual(res.body.blockedByUsers, []);
    });
  });

  describe('4. Unblock User Controller (unblockUser)', () => {
    it('removes target from both blocked:userId and blocked_by:targetId', async () => {
      await Promise.all([
        redis.sadd(`blocked:${aliceId}`, bobId),
        redis.sadd(`blocked_by:${bobId}`, aliceId),
      ]);

      const req = createMockReq({ userId: aliceId, targetId: bobId });
      const res = createMockRes();
      await unblockUser(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.unblockedUserId, bobId);

      const [aliceBlocked, bobBlockedBy] = await Promise.all([
        redis.smembers(`blocked:${aliceId}`),
        redis.smembers(`blocked_by:${bobId}`),
      ]);

      assert.equal(aliceBlocked.includes(bobId), false);
      assert.equal(bobBlockedBy.includes(aliceId), false);
    });

    it('is idempotent: unblocking a non-blocked user succeeds cleanly', async () => {
      const req = createMockReq({ userId: aliceId, targetId: bobId });
      const res = createMockRes();
      await unblockUser(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
    });
  });
});
