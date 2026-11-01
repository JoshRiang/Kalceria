import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { redis } from '../lib/redis.js';
import {
  resolveClientIp,
  resolveClientFingerprint,
  inspectPayloadSafety,
  globalPayloadDefense,
  checkL7Botnet,
  checkServiceBookingDefense,
  setServiceBookingCooldown,
  clearServiceBookingCooldown,
  clearMemStoreForTesting,
  eventRegistrationDefense,
  authLoginDefense,
  authSignupDefense,
  miniEventDefense,
} from '../middleware/ingressDefense.js';

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

describe('Ingress Defense in Depth & Multi-Form Security Vertical Slice', () => {
  beforeEach(() => {
    clearMemStoreForTesting();
  });

  after(async () => {
    try {
      if (redis?.disconnect) redis.disconnect();
    } catch {}
  });

  describe('1. Ingress Resolution (Vercel, Cloudflare, Reverse Proxy Migration)', () => {
    it('correctly resolves client IP from CF-Connecting-IP', () => {
      const req = { headers: { 'cf-connecting-ip': '203.0.113.195' } };
      assert.equal(resolveClientIp(req), '203.0.113.195');
    });

    it('correctly extracts original client from X-Forwarded-For multi-proxy chain', () => {
      const req = { headers: { 'x-forwarded-for': '198.51.100.42:443, 10.0.0.1' } };
      assert.equal(resolveClientIp(req), '198.51.100.42');
    });

    it('parses standard RFC 7239 Forwarded header', () => {
      const req = { headers: { forwarded: 'for=192.0.2.60;proto=http;by=203.0.113.43' } };
      assert.equal(resolveClientIp(req), '192.0.2.60');
    });

    it('strips IPv6-mapped IPv4 prefix (::ffff:)', () => {
      const req = { ip: '::ffff:192.168.1.50' };
      assert.equal(resolveClientIp(req), '192.168.1.50');
    });

    it('preserves valid IPv6 addresses and bracketed ports without chopping characters', () => {
      const reqBracketed = { headers: { 'x-forwarded-for': '[2001:db8::1]:8080' } };
      assert.equal(resolveClientIp(reqBracketed), '2001:db8::1');

      const reqIpv6Full = { ip: '2001:db8:85a3::8a2e:370:7334' };
      assert.equal(resolveClientIp(reqIpv6Full), '2001:db8:85a3::8a2e:370:7334');

      const reqLoopback = { ip: '::1' };
      assert.equal(resolveClientIp(reqLoopback), '::1');
    });

    it('produces consistent SHA-256 composite client fingerprint', () => {
      const req = {
        headers: {
          'cf-connecting-ip': '203.0.113.5',
          'x-machine-tag': 'kalceria-device-xyz',
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
      };
      const fp = resolveClientFingerprint(req);
      assert.equal(fp.ip, '203.0.113.5');
      assert.ok(fp.machineTag);
      assert.equal(typeof fp.fingerprint, 'string');
      assert.equal(fp.fingerprint.length, 64);
    });
  });

  describe('2. Deserialization, Prototype Pollution & Injection Normalization', () => {
    it('detects and blocks __proto__ prototype pollution attacks', () => {
      const dangerousObj = JSON.parse('{"__proto__": {"admin": true}}');
      const check = inspectPayloadSafety(dangerousObj);
      assert.equal(check.safe, false);
      assert.match(check.reason, /prototype pollution/i);
    });

    it('detects and blocks constructor prototype attacks', () => {
      const dangerousObj = { constructor: { prototype: { poll: true } } };
      const check = inspectPayloadSafety(dangerousObj);
      assert.equal(check.safe, false);
      assert.match(check.reason, /prototype pollution/i);
    });

    it('allows valid property names containing "prototype" such as prototypeLink', () => {
      const safeObj = { prototypeLink: 'https://figma.com/proto/123', isPrototype: true };
      const check = inspectPayloadSafety(safeObj);
      assert.equal(check.safe, true);
    });

    it('allows natural English/Indonesian sentences without false positive SQLi triggers', () => {
      const legitimateInputs = [
        'Please delete from the old list and update our event.',
        'Can we insert into next week slot instead?',
        'Kami ingin mengubah jadwal shooting dari slot kemarin.',
      ];

      for (const text of legitimateInputs) {
        const check = inspectPayloadSafety({ notes: text });
        assert.equal(check.safe, true, `Should allow natural text: "${text}"`);
      }
    });

    it('detects and blocks real SQL injection attacks', () => {
      const dangerousInputs = [
        "1' OR '1'='1",
        "UNION SELECT null, username, password FROM users",
        "; DROP TABLE service_bookings;",
        "exec sp_executesql 'SELECT 1'",
      ];

      for (const sql of dangerousInputs) {
        const check = inspectPayloadSafety({ filter: sql });
        assert.equal(check.safe, false, `Should block SQL injection: "${sql}"`);
      }
    });

    it('detects and blocks NoSQL operator injection ($gt, $where, $ne)', () => {
      const dangerousObj = { username: { $gt: '' }, password: { $ne: null } };
      const check = inspectPayloadSafety(dangerousObj);
      assert.equal(check.safe, false);
      assert.match(check.reason, /operator injection/i);
    });

    it('detects and blocks XSS script tags and javascript: URLs', () => {
      const dangerousObj = { comment: "<script>alert('xss')</script>" };
      const check = inspectPayloadSafety(dangerousObj);
      assert.equal(check.safe, false);
      assert.match(check.reason, /script injection/i);
    });

    it('rejects payloads with excessive breadth/nodes to prevent event loop DoS', () => {
      const flatList = Array.from({ length: 600 }, (_, i) => `item_${i}`);
      const check = inspectPayloadSafety({ items: flatList });
      assert.equal(check.safe, false);
      assert.match(check.reason, /complexity/i);
    });

    it('globalPayloadDefense middleware rejects dangerous payload with 400', () => {
      const req = {
        body: JSON.parse('{"__proto__": {"isAdmin": true}}'),
        query: {},
        params: {},
      };
      const res = createMockRes();
      let nextCalled = false;

      globalPayloadDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /prototype pollution/i);
      assert.equal(nextCalled, false);
    });

    it('globalPayloadDefense middleware allows legitimate payloads and tags req._payloadInspected', () => {
      const req = {
        body: {
          serviceType: 'EO',
          serviceName: 'Automotive Track Meet',
          contactPerson: 'Reinathan',
          whatsapp: '+6281234567890',
          location: 'Jl. Margonda Raya, Depok, Jawa Barat',
          notes: 'Please delete from the old list and add our new car shoot.',
        },
        query: { limit: '10' },
        params: { id: 'evt-123' },
      };
      const res = createMockRes();
      let nextCalled = false;

      globalPayloadDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 200);
      assert.equal(nextCalled, true);
      assert.equal(req._payloadInspected, true);
    });
  });

  describe('3. Layer 7 Botnet Mitigation', () => {
    it('identifies LOIC and HOIC stress test tools', () => {
      const reqLoic = { headers: { 'user-agent': 'Mozilla/5.0 LOIC/2.0' } };
      const reqHoic = { headers: { 'user-agent': 'HOIC High Orbit Ion Cannon' } };
      assert.equal(checkL7Botnet(reqLoic), true);
      assert.equal(checkL7Botnet(reqHoic), true);
    });

    it('identifies automated security scanners (sqlmap, nikto, masscan)', () => {
      const req = { headers: { 'user-agent': 'sqlmap/1.7#stable' } };
      assert.equal(checkL7Botnet(req), true);
    });

    it('permits legitimate browser User-Agents', () => {
      const req = { headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } };
      assert.equal(checkL7Botnet(req), false);
    });
  });

  describe('4. Need Our Help Form: 24-Hour Cooldown & Fair Scheduling Control', () => {
    it('allows initial valid booking request', async () => {
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0 Chrome/120.0' },
        ip: '203.0.113.10',
        body: {
          serviceType: 'EO',
          serviceName: 'Morning Meet',
          contactPerson: 'Aditya',
          whatsapp: '+6281234567890',
          location: 'Jl. Jenderal Sudirman, Jakarta Pusat, DKI Jakarta',
        },
      };
      const res = createMockRes();
      let nextCalled = false;

      await checkServiceBookingDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.equal(res.statusCode, 200);
    });

    it('blocks second booking from same IP within 24 hours with 429 and accurate Retry-After', async () => {
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0 Chrome/120.0' },
        ip: '203.0.113.20',
        body: { serviceName: 'First Booking' },
      };

      // 1. First booking succeeds and activates 24-hour lockout
      await setServiceBookingCooldown(req, 'user-456');

      // 2. Second booking within 24 hours
      const res = createMockRes();
      let nextCalled = false;

      await checkServiceBookingDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 429);
      assert.match(res.body.error, /24 hours/i);
      assert.ok(Number(res.getHeader('Retry-After')) > 0);
    });

    it('blocks second booking from different IP if machine tag matches', async () => {
      const tag = 'dev_hardware_tag_abc123';
      const req1 = {
        headers: { 'user-agent': 'Mozilla/5.0', 'x-machine-tag': tag },
        ip: '198.51.100.11',
      };
      await setServiceBookingCooldown(req1, null);

      // Attempt from different IP with same machine tag
      const req2 = {
        headers: { 'user-agent': 'Mozilla/5.0', 'x-machine-tag': tag },
        ip: '198.51.100.99',
        body: { serviceName: 'Attempted Double Booking' },
      };
      const res = createMockRes();
      let nextCalled = false;

      await checkServiceBookingDefense(req2, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 429);
      assert.match(res.body.error, /24 hours/i);
    });

    it('clears cooldown upon legitimate request cancellation', async () => {
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '203.0.113.30',
        body: { serviceName: 'Temporary Booking' },
      };

      await setServiceBookingCooldown(req, 'user-789');

      // User cancels booking
      await clearServiceBookingCooldown(req, 'user-789');

      // Now new booking should be accepted
      const res = createMockRes();
      let nextCalled = false;
      await checkServiceBookingDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.equal(res.statusCode, 200);
    });
  });

  describe('5. Form Ingress Shields Across Entire System', () => {
    it('Event Registration defense blocks attack tools and validates payloads', async () => {
      const req = {
        headers: { 'user-agent': 'LOIC/1.0' },
        ip: '10.0.0.1',
        body: { selectedSession: 'Morning' },
      };
      const res = createMockRes();
      let nextCalled = false;

      await eventRegistrationDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 403);
      assert.equal(nextCalled, false);
    });

    it('Auth Login defense blocks prototype pollution in credentials', async () => {
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '10.0.0.2',
        body: JSON.parse('{"email": "admin@kalceria.com", "__proto__": {"role": "ADMIN"}}'),
      };
      const res = createMockRes();
      let nextCalled = false;

      await authLoginDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /prototype pollution/i);
      assert.equal(nextCalled, false);
    });

    it('Auth Signup defense prevents botnet flood', async () => {
      const req = {
        headers: { 'user-agent': 'nikto/2.1.6' },
        ip: '10.0.0.3',
        body: { name: 'Bot Account' },
      };
      const res = createMockRes();
      let nextCalled = false;

      await authSignupDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 403);
      assert.equal(nextCalled, false);
    });

    it('Mini Event defense blocks operator injection in coordinates/body', async () => {
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '10.0.0.4',
        body: { title: 'Meetup', '$where': 'sleep(5000)' },
      };
      const res = createMockRes();
      let nextCalled = false;

      await miniEventDefense(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /operator injection/i);
      assert.equal(nextCalled, false);
    });
  });
});
