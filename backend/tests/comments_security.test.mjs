import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { redis } from '../lib/redis.js';
import {
  checkCommentDefense,
  setCommentCooldown,
  clearCommentCooldownsForTesting,
  resolveClientIp,
  resolveClientFingerprint,
} from '../middleware/commentDefense.js';
import { createComment } from '../controllers/commentController.js';
import prisma from '../lib/prisma.js';

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
      headers[key.toLowerCase()] = val;
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

describe('Comment Form Defense & Hardening Vertical Slice', () => {
  beforeEach(() => {
    clearCommentCooldownsForTesting();
  });

  describe('1. Layer 7 Attack Mitigation & LoIC Detection', () => {
    it('rejects LOIC attack signatures with 403 Forbidden', async () => {
      const req = {
        headers: {
          'user-agent': 'Mozilla/5.0 LOIC/1.0.8',
        },
        ip: '10.0.0.99',
      };
      const res = createMockRes();
      let nextCalled = false;

      await checkCommentDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 403);
      assert.match(res.body.error, /security policy/i);
      assert.equal(nextCalled, false);
    });

    it('rejects other automated attack tools (sqlmap/hoic) with 403 Forbidden', async () => {
      const req = {
        headers: {
          'user-agent': 'sqlmap/1.6.12#stable (http://sqlmap.org)',
        },
        ip: '10.0.0.98',
      };
      const res = createMockRes();
      let nextCalled = false;

      await checkCommentDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 403);
      assert.equal(nextCalled, false);
    });

    it('detects high-velocity flood / burst requests within 10s window and returns 429', async () => {
      const ip = '192.168.1.100';
      const req = {
        headers: { 'user-agent': 'Normal Browser' },
        ip,
      };

      // Send 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        const res = createMockRes();
        let nextCalled = false;
        await checkCommentDefense(req, res, () => {
          nextCalled = true;
        });
        assert.equal(nextCalled, true, `Request ${i + 1} should pass`);
      }

      // 4th request exceeds burst threshold (BURST_MAX = 3)
      const burstRes = createMockRes();
      let burstNextCalled = false;
      await checkCommentDefense(req, burstRes, () => {
        burstNextCalled = true;
      });

      assert.equal(burstRes.statusCode, 429);
      assert.match(burstRes.body.error, /velocity/i);
      assert.equal(burstNextCalled, false);
    });
  });

  describe('2. Two-Hour (7200s) Cooldown Enforcement', () => {
    it('blocks immediate second comment from authenticated user with 429 and Retry-After', async () => {
      const userId = 'user-auth-uuid-123';
      const req = {
        user: { userId },
        headers: { 'user-agent': 'KalceriaApp/1.0' },
        ip: '192.168.2.1',
      };

      // Set cooldown simulating successful comment submission
      await setCommentCooldown(req, userId);

      const res = createMockRes();
      let nextCalled = false;
      await checkCommentDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 429);
      assert.match(res.body.error, /2 hours/i);
      assert.ok(res.getHeader('retry-after'));
      assert.equal(nextCalled, false);
    });

    it('blocks immediate second comment from unauthenticated IP with 429 and Retry-After', async () => {
      const ip = '203.0.113.42';
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip,
      };

      await setCommentCooldown(req, null);

      const res = createMockRes();
      let nextCalled = false;
      await checkCommentDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 429);
      assert.match(res.body.error, /2 hours/i);
      assert.ok(res.getHeader('retry-after'));
      assert.equal(nextCalled, false);
    });

    it('blocks unauthenticated user with same machine/fingerprint tag even from different IP', async () => {
      const deviceTag = 'dev_hardware_signature_abc999';
      const req1 = {
        headers: {
          'user-agent': 'Chrome/120',
          'x-client-fingerprint': deviceTag,
        },
        ip: '198.51.100.1',
      };

      // Submit first comment from IP 1
      await setCommentCooldown(req1, null);

      // Attempt second comment from IP 2 with same machine tag
      const req2 = {
        headers: {
          'user-agent': 'Chrome/120',
          'x-client-fingerprint': deviceTag,
        },
        ip: '198.51.100.2',
      };

      const res2 = createMockRes();
      let nextCalled = false;
      await checkCommentDefense(req2, res2, () => {
        nextCalled = true;
      });

      assert.equal(res2.statusCode, 429);
      assert.match(res2.body.error, /2 hours/i);
      assert.equal(nextCalled, false);
    });
  });

  describe('3. Account Authentication & Anti-Spoofing Verification', () => {
    it('rejects posting as "User" if no session exists with 401 Unauthorized', async () => {
      const req = {
        body: {
          content: 'This should fail authentication.',
          category: 'General',
          type: 'IDEA',
          identity: 'User',
        },
        user: null,
      };
      const res = createMockRes();

      await createComment(req, res, () => {});

      assert.equal(res.statusCode, 401);
      assert.match(res.body.error, /sign in/i);
    });

    it('rejects body.userId mismatch when attempting to spoof another account with 403 Forbidden', async () => {
      const req = {
        body: {
          content: 'Attempting to spoof another user id.',
          category: 'General',
          type: 'IDEA',
          identity: 'User',
          userId: 'victim-account-id',
        },
        user: { userId: 'attacker-account-id' },
      };
      const res = createMockRes();

      await createComment(req, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.match(res.body.error, /Account mismatch/i);
    });

    it('rejects posting with another user nickname / display name with 403 Forbidden', async () => {
      // Mock prisma.user.findUnique
      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = async () => ({
        id: 'real-user-123',
        name: 'Ditya Alif',
        nickname: 'dityalif',
        email: 'ditya@kalceria.com',
      });

      try {
        const req = {
          body: {
            content: 'Trying to impersonate Reinathan.',
            category: 'General',
            type: 'ADVICE',
            identity: 'User',
            username: 'Reinathan', // Impersonation attempt!
          },
          user: { userId: 'real-user-123' },
        };
        const res = createMockRes();

        await createComment(req, res, () => {});

        assert.equal(res.statusCode, 403);
        assert.match(res.body.error, /Display name does not match/i);
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });

    it('allows authenticated user posting with their own nickname and triggers cooldown', async () => {
      const originalFindUnique = prisma.user.findUnique;
      const originalCreate = prisma.comment.create;

      let createdCommentData = null;
      prisma.user.findUnique = async () => ({
        id: 'real-user-123',
        name: 'Ditya Alif',
        nickname: 'dityalif',
        email: 'ditya@kalceria.com',
      });
      prisma.comment.create = async ({ data }) => {
        createdCommentData = data;
        return { id: 'comment-uuid-1', ...data, createdAt: new Date() };
      };

      try {
        const req = {
          body: {
            content: 'Legitimate advice from verified user.',
            category: 'Event',
            type: 'ADVICE',
            identity: 'User',
            username: 'dityalif',
          },
          user: { userId: 'real-user-123' },
          ip: '127.0.0.1',
          headers: {},
        };
        const res = createMockRes();

        await createComment(req, res, () => {});

        assert.equal(res.statusCode, 201);
        assert.equal(res.body.success, true);
        assert.equal(createdCommentData.username, 'dityalif');
        assert.equal(createdCommentData.userId, 'real-user-123');

        // Verify cooldown was activated
        const cooldownCheckRes = createMockRes();
        let nextCalled = false;
        await checkCommentDefense(req, cooldownCheckRes, () => {
          nextCalled = true;
        });
        assert.equal(cooldownCheckRes.statusCode, 429);
        assert.equal(nextCalled, false);
      } finally {
        prisma.user.findUnique = originalFindUnique;
        prisma.comment.create = originalCreate;
      }
    });

    it('allows authenticated user posting with generic "Authenticated User" or omitting username and assigns verified name', async () => {
      const originalFindUnique = prisma.user.findUnique;
      const originalCreate = prisma.comment.create;

      let createdCommentData = null;
      prisma.user.findUnique = async () => ({
        id: 'real-user-123',
        name: 'Ditya Alif',
        nickname: 'dityalif',
        email: 'ditya@kalceria.com',
      });
      prisma.comment.create = async ({ data }) => {
        createdCommentData = data;
        return { id: 'comment-uuid-2', ...data, createdAt: new Date() };
      };

      try {
        const req = {
          body: {
            content: 'Legitimate advice from verified user without custom handle.',
            category: 'Event',
            type: 'ADVICE',
            identity: 'User',
            username: 'Authenticated User',
          },
          user: { userId: 'real-user-123' },
          ip: '127.0.0.1',
          headers: {},
        };
        const res = createMockRes();

        await createComment(req, res, () => {});

        assert.equal(res.statusCode, 201);
        assert.equal(res.body.success, true);
        assert.equal(createdCommentData.username, 'dityalif');
        assert.equal(createdCommentData.userId, 'real-user-123');
      } finally {
        prisma.user.findUnique = originalFindUnique;
        prisma.comment.create = originalCreate;
      }
    });
  });

  describe('4. Input Validation & Boundaries', () => {
    it('rejects comment with content length < 20 or > 200 characters', async () => {
      const reqShort = {
        body: { content: 'Short test', type: 'IDEA', category: 'Event' },
      };
      const resShort = createMockRes();
      await createComment(reqShort, resShort, () => {});

      assert.equal(resShort.statusCode, 400);
      assert.match(resShort.body.error, /between 20 and 200/i);

      const reqLong = {
        body: { content: 'A'.repeat(201), type: 'IDEA', category: 'Event' },
      };
      const resLong = createMockRes();
      await createComment(reqLong, resLong, () => {});

      assert.equal(resLong.statusCode, 400);
      assert.match(resLong.body.error, /between 20 and 200/i);
    });

    it('rejects comment with invalid type (not ADVICE or IDEA)', async () => {
      const req = {
        body: { content: 'This is a valid comment length.', type: 'SPAM', category: 'General' },
      };
      const res = createMockRes();
      await createComment(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /valid comment category and type/i);
    });

    it('rejects invalid identity property', async () => {
      const req = {
        body: {
          content: 'This is a valid comment length.',
          type: 'IDEA',
          category: 'General',
          identity: 'SuperUser',
        },
      };
      const res = createMockRes();
      await createComment(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /valid identity/i);
    });
  });

  describe('5. IP & Fingerprint Resolution Utilities', () => {
    it('resolves CF-Connecting-IP when behind Cloudflare proxy', () => {
      const req = {
        headers: {
          'cf-connecting-ip': '203.0.113.195',
          'x-forwarded-for': '10.0.0.1',
        },
      };
      assert.equal(resolveClientIp(req), '203.0.113.195');
    });

    it('generates consistent SHA-256 fingerprint for machine identification', () => {
      const reqA = {
        headers: {
          'cf-connecting-ip': '1.2.3.4',
          'x-client-fingerprint': 'dev-unique-123',
          'user-agent': 'KalceriaTestUA',
          'accept-language': 'en-US',
        },
      };
      const fpA = resolveClientFingerprint(reqA);

      const reqB = {
        headers: {
          'cf-connecting-ip': '1.2.3.4',
          'x-client-fingerprint': 'dev-unique-123',
          'user-agent': 'KalceriaTestUA',
          'accept-language': 'en-US',
        },
      };
      const fpB = resolveClientFingerprint(reqB);

      assert.equal(fpA.fingerprint, fpB.fingerprint);
      assert.equal(fpA.machineTag, 'dev-unique-123');
    });
  });

  after(async () => {
    try {
      if (redis?.disconnect) redis.disconnect();
    } catch {}
  });
});
