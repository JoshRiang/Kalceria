import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { Resend } from 'resend';
import { redis } from '../lib/redis.js';
import {
  isValidIndonesianLocation,
  signLocationToken,
  isWithinIndonesiaBounds,
  INDONESIAN_PROVINCES,
} from '../controllers/geoController.js';
import {
  createServiceRequest,
  buildServiceRequestWaMessage,
  getServiceRequestForEdit,
  updateServiceRequest,
  deleteOwnServiceRequest,
  confirmServiceRequest,
  purgeExpiredUnconfirmedServiceBookings,
} from '../controllers/serviceController.js';
import {
  checkServiceBookingDefense,
  setServiceBookingCooldown,
  clearServiceBookingCooldown,
  clearMemStoreForTesting,
  getMem,
} from '../middleware/ingressDefense.js';
import {
  buildServiceRequestSubmittedEmailHtml,
  buildServiceRequestUpdatedEmailHtml,
  buildServiceRequestConfirmedEmailHtml,
} from '../lib/mailer.js';
import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken';

// ── Strict Invariant: Conserve Resend Tokens (Never dispatch real emails in tests) ──
try {
  const dummyResend = new Resend('re_mock_test_key_for_safety');
  const emailsProto = Object.getPrototypeOf(dummyResend.emails);
  emailsProto.send = async () => ({ data: { id: 'mock-resend-test-id' }, error: null });
} catch {}

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

describe('PIRAMIDA PENGUJIAN VERTIKAL: NEED OUR HELP FORM (SERVICE REQUEST)', () => {


  // ═════════════════════════════════════════════════════════════════════════════
  // FASE 1: UNIT & BOUNDARY VALIDATION FOUNDATION (FONDASI VALIDASI MURNI)
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Fase 1: Unit & Boundary Validation Foundation (Fondasi Validasi Murni)', () => {
    describe('1.1. Indonesian WhatsApp & Phone Number Regex Validation', () => {
      const validNumbers = [
        '+628117998790', // Telkomsel Halo (Official Admin)
        '+6281234567890', // Telkomsel
        '+6282112345678', // Telkomsel SimPATI
        '+6281512345678', // Indosat IM3
        '+6285712345678', // Indosat Ooredoo
        '+6281712345678', // XL Axiata
        '+6287812345678', // XL Prioritas
        '+6289612345678', // Tri (3)
      ];

      for (const phone of validNumbers) {
        it(`accepts valid Indonesian mobile number: ${phone}`, async () => {
          const req = {
            body: {
              serviceType: 'SHOOTING',
              serviceName: 'Rolling Shot Depok',
              contactPerson: 'Reinathan',
              whatsapp: phone,
              email: 'valid.client@kalceria.id',
              location: 'Jl. Margonda Raya, Kota Depok, Jawa Barat',
              slots: [{ date: '2026-11-20', startTime: '10:00', endTime: '12:00' }],
            },
            ip: '127.0.0.1',
          };
          const res = createMockRes();

          // Mock DB to strictly prevent touching production Postgres/Redis
          const originalFindUnique = prisma.user.findUnique;
          const originalUserCreate = prisma.user.create;
          const originalBookingCreate = prisma.serviceBooking.create;

          prisma.user.findUnique = async () => ({
            id: 'mock-user-123',
            name: 'Reinathan',
            email: 'valid.client@kalceria.id',
          });
          prisma.user.create = async () => ({
            id: 'mock-user-123',
            name: 'Reinathan',
            email: 'valid.client@kalceria.id',
          });
          prisma.serviceBooking.create = async ({ data }) => ({
            id: 'mock-booking-id',
            ...data,
            createdAt: new Date(),
          });

          try {
            await createServiceRequest(req, res, () => {});
            assert.equal(res.statusCode, 201, `Number ${phone} should be accepted`);
            assert.ok(res.body.bookingId);
          } finally {
            prisma.user.findUnique = originalFindUnique;
            prisma.user.create = originalUserCreate;
            prisma.serviceBooking.create = originalBookingCreate;
          }
        });
      }

      const invalidNumbers = [
        '645645465',           // Gibberish digits
        '12345',               // Too short
        '+628123456789012345', // Too long (> 13 digits after prefix)
        '081111111111',        // Monotonous repeating digits (and lacks +62 prefix)
        '082222222222',        // Monotonous repeating digits
        'not-a-number',        // Alphabetic string
        '+18005550199',        // Non-Indonesian US number
      ];

      for (const badPhone of invalidNumbers) {
        it(`rejects invalid phone number: ${badPhone}`, async () => {
          const req = {
            body: {
              serviceType: 'SHOOTING',
              serviceName: 'Rolling Shot Depok',
              contactPerson: 'Reinathan',
              whatsapp: badPhone,
              email: 'client@kalceria.id',
              location: 'Jl. Margonda Raya, Kota Depok, Jawa Barat',
              slots: [{ date: '2026-11-20', startTime: '10:00', endTime: '12:00' }],
            },
            ip: '127.0.0.1',
          };
          const res = createMockRes();
          await createServiceRequest(req, res, () => {});

          assert.equal(res.statusCode, 400);
          assert.match(res.body.error, /Indonesian WhatsApp/i);
        });
      }
    });

    describe('1.2. Indonesian Geographic Bounds & Location Token HMAC', () => {
      it('isWithinIndonesiaBounds accepts coordinates strictly inside Indonesia', () => {
        // Jakarta Monas
        assert.equal(isWithinIndonesiaBounds(-6.1754, 106.8272), true);
        // Bali Denpasar
        assert.equal(isWithinIndonesiaBounds(-8.6705, 115.2126), true);
        // Sabang Aceh (Northwest boundary)
        assert.equal(isWithinIndonesiaBounds(5.8943, 95.3195), true);
        // Merauke Papua (Southeast boundary)
        assert.equal(isWithinIndonesiaBounds(-8.4991, 140.4014), true);
      });

      it('isWithinIndonesiaBounds rejects coordinates outside Indonesian territory bounds', () => {
        // Tokyo Japan
        assert.equal(isWithinIndonesiaBounds(35.6762, 139.6503), false);
        // London UK
        assert.equal(isWithinIndonesiaBounds(51.5074, -0.1278), false);
        // New York USA
        assert.equal(isWithinIndonesiaBounds(40.7128, -74.0060), false);
        // Sydney Australia
        assert.equal(isWithinIndonesiaBounds(-33.8688, 151.2093), false);
      });

      it('signs and verifies HMAC-SHA256 location selectionToken with tamper resistance', () => {
        const token = signLocationToken('Jl. Margonda Raya, Depok, Jawa Barat', -6.3728, 106.8335);
        assert.equal(typeof token, 'string');
        assert.equal(token.length, 64);
        assert.match(token, /^[0-9a-f]{64}$/);

        // Tampered token does not match
        const tampered = token.slice(0, -4) + 'abcd';
        assert.notEqual(tampered, token);
      });

      it('rejects service request with gibberish deployment area (e.g. Jwhshennd) with 400 Bad Request', async () => {
        const req = {
          body: {
            serviceType: 'EO',
            serviceName: 'Automotive Track Meet',
            contactPerson: 'Reinathan',
            whatsapp: '+628117998790',
            email: 'client@kalceria.id',
            location: 'Jwhshennd', // Gibberish location
            slots: [{ date: '2026-11-20', startTime: '10:00', endTime: '12:00' }],
          },
          ip: '127.0.0.1',
        };
        const res = createMockRes();
        await createServiceRequest(req, res, () => {});

        assert.equal(res.statusCode, 400);
        assert.match(res.body.error, /Deployment area/i);
      });

      it('validates verified streets, cities, and all 38 Indonesian provinces', () => {
        assert.equal(isValidIndonesianLocation('Jawa Barat'), true);
        assert.equal(isValidIndonesianLocation('DKI Jakarta'), true);
        assert.equal(isValidIndonesianLocation('Bali'), true);
        assert.equal(isValidIndonesianLocation('Papua Barat Daya'), true);
        assert.equal(isValidIndonesianLocation('SomewhereInAntarctica'), false);
        assert.equal(INDONESIAN_PROVINCES.length, 38);
      });
    });

    describe('1.3. Email Input & Anti-Garbage Filter', () => {
      it('rejects service request with missing or invalid email address with 400 Bad Request', async () => {
        const badEmails = ['', 'not-an-email', 'client@', '@domain.com', 'user@domain'];
        for (const badEmail of badEmails) {
          const req = {
            body: {
              serviceType: 'SHOOTING',
              serviceName: 'Production Video',
              contactPerson: 'Reinathan',
              whatsapp: '+628117998790',
              email: badEmail,
              location: 'Jl. Margonda Raya, Kota Depok, Jawa Barat',
              slots: [{ date: '2026-11-20', startTime: '10:00', endTime: '12:00' }],
            },
            ip: '127.0.0.1',
          };
          const res = createMockRes();
          await createServiceRequest(req, res, () => {});

          assert.equal(res.statusCode, 400);
          assert.match(res.body.error, /Email/i);
        }
      });
    });

    describe('1.4. Service Type, Name & Slot Structure Enforcement', () => {
      it('rejects invalid serviceType with 400 Bad Request', async () => {
        const req = {
          body: {
            serviceType: 'INVALID_SERVICE_TYPE',
            serviceName: 'Production Video',
            contactPerson: 'Reinathan',
            whatsapp: '+628117998790',
            email: 'client@kalceria.id',
            location: 'Jl. Margonda Raya, Kota Depok, Jawa Barat',
            slots: [{ date: '2026-11-20', startTime: '10:00', endTime: '12:00' }],
          },
          ip: '127.0.0.1',
        };
        const res = createMockRes();
        await createServiceRequest(req, res, () => {});

        assert.equal(res.statusCode, 400);
        assert.match(res.body.error, /serviceType/i);
      });

      it('rejects service request with empty or missing time slots with 400 Bad Request', async () => {
        const req = {
          body: {
            serviceType: 'SHOOTING',
            serviceName: 'Production Video',
            contactPerson: 'Reinathan',
            whatsapp: '+628117998790',
            email: 'client@kalceria.id',
            location: 'Jl. Margonda Raya, Kota Depok, Jawa Barat',
            slots: [], // Empty slots!
          },
          ip: '127.0.0.1',
        };
        const res = createMockRes();
        await createServiceRequest(req, res, () => {});

        assert.equal(res.statusCode, 400);
        assert.match(res.body.error, /slot/i);
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FASE 2: COMPOUND SECURITY & INGRESS DEFENSE GATE
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Fase 2: Compound Security & Ingress Defense Gate', () => {
    describe('2.1. Layer 7 Botnet Mitigation', () => {
      it('blocks automated attack tools and scanners (sqlmap, nikto, loic, hoic, masscan) with 403 Forbidden', async () => {
        const maliciousUAs = [
          'Mozilla/5.0 LOIC/1.0.8',
          'sqlmap/1.6.12#stable',
          'Nikto/2.1.6',
          'masscan/1.3',
        ];

        for (const ua of maliciousUAs) {
          const req = {
            headers: { 'user-agent': ua },
            ip: '198.51.100.44',
          };
          const res = createMockRes();
          let passed = false;
          await checkServiceBookingDefense(req, res, () => { passed = true; });

          assert.equal(passed, false);
          assert.equal(res.statusCode, 403);
          assert.match(res.body.error, /security policy/i);
        }
      });
    });

    describe('2.2. Burst Rate Limiting', () => {
      it('allows up to 3 fast booking attempts and blocks 4th with 429 and Retry-After: 30', async () => {
        const ip = '198.51.100.99';
        const req = {
          headers: { 'user-agent': 'KalceriaBookingClient/1.0' },
          ip,
        };

        try { await redis.del(`booking:burst:${ip}`); } catch {}

        for (let i = 1; i <= 3; i++) {
          const res = createMockRes();
          let passed = false;
          await checkServiceBookingDefense(req, res, () => { passed = true; });
          assert.equal(passed, true, `Booking attempt ${i} should pass burst filter`);
        }

        const burstRes = createMockRes();
        let passed = false;
        await checkServiceBookingDefense(req, burstRes, () => { passed = true; });

        assert.equal(passed, false);
        assert.equal(burstRes.statusCode, 429);
        assert.match(burstRes.body.error, /velocity/i);
        assert.equal(burstRes.getHeader('retry-after'), '30');
      });
    });

    describe('2.3. 24-Hour Cooldown & Fair Scheduling Control', () => {
      it('allows initial valid booking and blocks second booking from same IP with 429', async () => {
        clearMemStoreForTesting();
        const ip = '203.0.113.123';
        const req = {
          headers: { 'user-agent': 'Chrome/124.0' },
          ip,
        };

        // 1. Initial attempt passes defense
        const res1 = createMockRes();
        let passed1 = false;
        await checkServiceBookingDefense(req, res1, () => { passed1 = true; });
        assert.equal(passed1, true);

        // 2. Booking submitted -> 24h cooldown set
        await setServiceBookingCooldown(req, 'user-mock-123');

        // 3. Second attempt within 24h is blocked with 429
        const res2 = createMockRes();
        let passed2 = false;
        await checkServiceBookingDefense(req, res2, () => { passed2 = true; });
        assert.equal(passed2, false);
        assert.equal(res2.statusCode, 429);
        assert.match(res2.body.error, /24 hours/i);
        assert.ok(res2.getHeader('retry-after'));
      });

      it('blocks second booking from different IP if machine tag matches', async () => {
        clearMemStoreForTesting();
        const tag = 'dev_machine_tag_service_unique_456';
        const req1 = {
          headers: {
            'user-agent': 'Chrome/124.0',
            'x-machine-tag': tag,
          },
          ip: '198.51.100.10',
        };

        // Submit from IP 1
        await setServiceBookingCooldown(req1, null);

        // Attempt from IP 2 with same machine tag
        const req2 = {
          headers: {
            'user-agent': 'Chrome/124.0',
            'x-machine-tag': tag,
          },
          ip: '198.51.100.20', // Different IP!
        };

        const res2 = createMockRes();
        let passed = false;
        await checkServiceBookingDefense(req2, res2, () => { passed = true; });

        assert.equal(passed, false);
        assert.equal(res2.statusCode, 429);
        assert.match(res2.body.error, /24 hours/i);
      });
    });

    describe('2.4. Cooldown Release on Legitimate Cancellation', () => {
      it('clears cooldown upon legitimate request cancellation within 3 minutes', async () => {
        clearMemStoreForTesting();
        const ip = '203.0.113.124';
        const req = {
          headers: { 'user-agent': 'Chrome/124.0' },
          ip,
        };

        // Set 24h cooldown
        await setServiceBookingCooldown(req, 'user-cancel-test-1');

        // Verify blocked
        const resBlocked = createMockRes();
        let passed = false;
        await checkServiceBookingDefense(req, resBlocked, () => { passed = true; });
        assert.equal(passed, false);

        // Cancel booking -> cooldown cleared
        await clearServiceBookingCooldown(req, 'user-cancel-test-1');

        // Subsequent attempt passes
        const resAllowed = createMockRes();
        passed = false;
        await checkServiceBookingDefense(req, resAllowed, () => { passed = true; });
        assert.equal(passed, true, 'Request after cancellation should pass defense cleanly');
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FASE 3: DOUBLE COMPOUND - STATE LIFECYCLE, 3-MINUTE WINDOW & ATOMIC UPDATE
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Fase 3: Double Compound - State Lifecycle, 3-Minute Window & Atomic Update', () => {
    describe('3.1. WhatsApp Message Formatting (Admin Target + Zero Emojis)', () => {
      it('buildServiceRequestWaMessage formats Part 3 metadata with target +62 8117998790 and zero emojis', () => {
        const mockBooking = {
          id: 'svc-uuid-abcdef-123456',
          serviceType: 'SHOOTING',
          serviceName: 'Automotive Rolling Shot',
          contactPerson: 'Reinathan',
          whatsapp: '+628117998790',
          location: 'Jl. Margonda Raya, Depok, Jawa Barat',
          additionalNotes: 'Require 4K 60fps rig and gimbal operator.',
        };
        const mockSlots = [
          { date: '2026-11-20', startTime: '10:00', endTime: '12:00' },
        ];

        const msg = buildServiceRequestWaMessage(
          mockBooking,
          mockSlots,
          mockBooking.contactPerson,
          mockBooking.whatsapp,
          mockBooking.location,
          mockBooking.additionalNotes,
          'Reinathan (reinathan@kalceria.com)'
        );

        assert.match(msg, /^SERVICE REQUEST - NEED OUR HELP/);
        assert.match(msg, /Booking ID: #123456/);
        assert.match(msg, /Service: Shooting \/ Production/);
        assert.match(msg, /Request Title: Automotive Rolling Shot/);
        assert.match(msg, /Operator Name: Reinathan/);
        assert.match(msg, /WhatsApp: \+628117998790/);
        assert.match(msg, /Deployment Area: Jl\. Margonda Raya/);
        assert.match(msg, /Selected Hours: 10:00 - 12:00/);

        // Strict zero-emoji check
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
        assert.equal(emojiRegex.test(msg), false, 'Service WhatsApp message must not contain any emojis');
      });

      it('buildServiceRequestWaMessage formats UPDATE PESANAN header when isUpdate is true', () => {
        const mockBooking = {
          id: 'svc-uuid-update-777',
          serviceType: 'EO',
          serviceName: 'Track Day Meetup',
          contactPerson: 'Reinathan',
          whatsapp: '+628117998790',
          location: 'Sentul International Circuit',
          additionalNotes: 'Added 2 marshall cars',
        };
        const mockSlots = [{ date: '2026-11-25', startTime: '14:00', endTime: '18:00' }];

        const msg = buildServiceRequestWaMessage(
          mockBooking,
          mockSlots,
          mockBooking.contactPerson,
          mockBooking.whatsapp,
          mockBooking.location,
          mockBooking.additionalNotes,
          'Reinathan',
          true // isUpdate = true
        );

        assert.match(msg, /^UPDATE PESANAN - NEED OUR HELP/);
        assert.match(msg, /Booking ID: #te-777/);
        assert.match(msg, /Service: Event Organizer/);
      });
    });

    describe('3.2. 3-Minute Unified Window Enforcement (Inspect vs Expire)', () => {
      it('getServiceRequestForEdit allows access within 3 minutes and returns dynamic remainingSeconds', async () => {
        const originalFindUnique = prisma.serviceBooking.findUnique;
        const now = new Date();
        const createdAt = new Date(now.getTime() - 45 * 1000); // 45 seconds ago (within 180s)

        prisma.serviceBooking.findUnique = async () => ({
          id: 'svc-window-test-1',
          requestorId: 'user-auth-123',
          serviceType: 'SHOOTING',
          serviceName: 'Rolling Shot',
          status: 'PENDING',
          createdAt,
          slots: [{ date: new Date('2026-11-20'), startTime: '10:00', endTime: '12:00' }],
          requestor: { id: 'user-auth-123', email: 'user@kalceria.id' },
        });

        try {
          const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
          const validToken = jwt.sign(
            { bookingId: 'svc-window-test-1', requestorId: 'user-auth-123', action: 'manage' },
            cancelSecret,
            { expiresIn: '3m', issuer: 'kalceria-api' }
          );

          const req = {
            params: { id: 'svc-window-test-1' },
            query: { token: validToken },
            get: (h) => (h === 'x-manage-token' ? validToken : ''),
          };
          const res = createMockRes();
          await getServiceRequestForEdit(req, res, () => {});

          assert.equal(res.statusCode, 200);
          assert.ok(res.body.booking);
          assert.ok(res.body.remainingSeconds <= 136 && res.body.remainingSeconds >= 120);
        } finally {
          prisma.serviceBooking.findUnique = originalFindUnique;
        }
      });

      it('getServiceRequestForEdit and deleteOwnServiceRequest reject with 403 when 3-minute window has expired', async () => {
        const originalFindUnique = prisma.serviceBooking.findUnique;
        const originalDelete = prisma.serviceBooking.delete;
        const now = new Date();
        const createdAt = new Date(now.getTime() - 190 * 1000); // 190s ago (> 180s / 3m)

        prisma.serviceBooking.findUnique = async () => ({
          id: 'svc-expired-test-1',
          requestorId: 'user-auth-123',
          serviceType: 'SHOOTING',
          status: 'PENDING',
          createdAt,
          slots: [],
          requestor: { id: 'user-auth-123', email: 'user@kalceria.id' },
        });
        prisma.serviceBooking.delete = async () => ({ id: 'svc-expired-test-1' });

        try {
          const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
          const validToken = jwt.sign(
            { bookingId: 'svc-expired-test-1', requestorId: 'user-auth-123', action: 'manage' },
            cancelSecret,
            { expiresIn: '10m', issuer: 'kalceria-api' } // JWT valid, but DB createdAt expired!
          );

          // 1. Edit inspect is rejected
          const reqEdit = {
            params: { id: 'svc-expired-test-1' },
            query: { token: validToken },
            get: (h) => (h === 'x-manage-token' ? validToken : ''),
          };
          const resEdit = createMockRes();
          await getServiceRequestForEdit(reqEdit, resEdit, () => {});
          assert.equal(resEdit.statusCode, 403);
          assert.match(resEdit.body.error, /3 menit/i);

          // 2. Cancellation is rejected
          const reqDelete = {
            params: { id: 'svc-expired-test-1' },
            body: { bookingId: 'svc-expired-test-1', cancelToken: validToken },
            get: (h) => (h === 'x-cancel-token' ? validToken : ''),
          };
          const resDelete = createMockRes();
          await deleteOwnServiceRequest(reqDelete, resDelete, () => {});
          assert.equal(resDelete.statusCode, 403);
          assert.match(resDelete.body.error, /3 menit/i);
        } finally {
          prisma.serviceBooking.findUnique = originalFindUnique;
          prisma.serviceBooking.delete = originalDelete;
        }
      });
    });

    describe('3.3. Single Atomic Transaction for Booking Update', () => {
      it('updateServiceRequest preserves original 3-minute timeline without resetting countdown counter', async () => {
        const originalFindUnique = prisma.serviceBooking.findUnique;
        const originalTransaction = prisma.$transaction;

        const initialCreatedAt = new Date(Date.now() - 70 * 1000); // 70s elapsed of 180s

        prisma.serviceBooking.findUnique = async () => ({
          id: 'svc-orig-booking-id',
          requestorId: 'user-auth-123',
          serviceType: 'SHOOTING',
          serviceName: 'Automotive Rolling Shot',
          contactPerson: 'Reinathan',
          whatsapp: '+628117998790',
          location: 'Jl. Margonda Raya, Depok, Jawa Barat',
          status: 'PENDING',
          createdAt: initialCreatedAt,
          slots: [{ date: new Date('2026-11-20'), startTime: '10:00', endTime: '12:00' }],
          requestor: { id: 'user-auth-123', email: 'client@kalceria.id' },
        });

        let updatedCreatedAt = null;
        prisma.$transaction = async (fn) => {
          const fakeTx = {
            serviceBookingSlot: { deleteMany: async () => ({ count: 1 }) },
            serviceBooking: {
              delete: async () => ({ id: 'svc-orig-booking-id' }),
              create: async ({ data }) => {
                updatedCreatedAt = data.createdAt;
                return {
                  id: 'svc-updated-booking-id',
                  ...data,
                  slots: [{ date: new Date('2026-11-26'), startTime: '18:00', endTime: '22:00' }],
                  requestor: { id: 'user-auth-123', email: 'client@kalceria.id' },
                };
              },
            },
          };
          return fn(fakeTx);
        };

        try {
          const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
          const validToken = jwt.sign(
            { bookingId: 'svc-orig-booking-id', requestorId: 'user-auth-123', action: 'manage' },
            cancelSecret,
            { expiresIn: '3m', issuer: 'kalceria-api' }
          );

          const req = {
            params: { id: 'svc-orig-booking-id' },
            body: {
              serviceType: 'SHOOTING',
              serviceName: 'Automotive Rolling Shot (Updated)',
              contactPerson: 'Reinathan',
              whatsapp: '+628117998790',
              location: 'Jl. Margonda Raya, Depok, Jawa Barat',
              additionalNotes: 'Updated rig specs',
              slots: [{ date: '2026-11-26', startTime: '18:00', endTime: '22:00' }],
            },
            get: (h) => (h === 'x-manage-token' ? validToken : ''),
          };
          const res = createMockRes();

          await updateServiceRequest(req, res, () => {});

          assert.equal(res.statusCode, 200);
          assert.equal(res.body.success, true);
          assert.equal(res.body.bookingId, 'svc-updated-booking-id');
          // Counter NOT reset! Original createdAt preserved:
          assert.equal(updatedCreatedAt.getTime(), initialCreatedAt.getTime());
          assert.ok(res.body.remainingSeconds <= 115 && res.body.remainingSeconds >= 100);
        } finally {
          prisma.serviceBooking.findUnique = originalFindUnique;
          prisma.$transaction = originalTransaction;
        }
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FASE 4: PIRAMIDA VERTICAL SLICE UTUH (END-TO-END VERTICAL SLICE)
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Fase 4: Pyramidal Vertical Slice Utuh (End-to-End Vertical Slice)', () => {
    describe('4.1. Three-Email Lifecycle Protocol (Submitted vs Updated vs Confirmed)', () => {
      const mockBooking = {
        id: 'svc-email-lifecycle-123',
        serviceType: 'HOST_EVENT',
        serviceName: 'Annual Kalceria Meetup',
        location: 'Sentul International Circuit',
        additionalNotes: 'Need sound system and flags',
      };
      const mockSlots = [{ date: '2026-11-28', startTime: '09:00', endTime: '17:00' }];
      const mockUser = { name: 'Varsha Kurniawan', email: 'varsikurniawan@gmail.com' };

      it('Email #1 (Submitted) contains CONFIRM, EDIT, and CANCEL buttons with 3-minute policy', () => {
        const html = buildServiceRequestSubmittedEmailHtml({
          booking: mockBooking,
          slots: mockSlots,
          user: mockUser,
          cancelToken: 'sample-token-1',
        });

        assert.match(html, /CONFIRM/);
        assert.match(html, /EDIT/);
        assert.match(html, /CANCEL/);
        assert.match(html, /3 Menit/);
        assert.match(html, /Annual Kalceria Meetup/);
        assert.match(html, /Sentul International Circuit/);
      });

      it('Email #2 (Updated) contains CONFIRM and CANCEL buttons, and STRICTLY NO EDIT BUTTON', () => {
        const html = buildServiceRequestUpdatedEmailHtml({
          booking: mockBooking,
          slots: mockSlots,
          user: mockUser,
          cancelToken: 'sample-token-2',
        });

        assert.match(html, /CONFIRM/);
        assert.match(html, /CANCEL/);
        // Strict invariant: NO EDIT button in update email
        assert.doesNotMatch(html, />EDIT</);
        assert.match(html, /Ringkasan Update/);
        assert.match(html, /3 Menit Terpadu/);
      });

      it('Email #3 (Confirmed) contains order summary and STRICTLY ZERO BUTTONS AT ALL', () => {
        const html = buildServiceRequestConfirmedEmailHtml({
          booking: mockBooking,
          slots: mockSlots,
          user: mockUser,
        });

        assert.match(html, /RINGKASAN PESANAN/);
        assert.match(html, /Order Confirmed &amp; Persisted/);
        assert.match(html, /telah terkonfirmasi dan resmi tersimpan/);
        assert.match(html, /telah terkunci/);
        // Strict invariant: NO buttons at all once confirmed
        assert.doesNotMatch(html, />CONFIRM</);
        assert.doesNotMatch(html, />EDIT</);
        assert.doesNotMatch(html, />CANCEL</);
      });
    });

    describe('4.2. Confirm Action & Super-Variable Lock (Idempotency & Operation Locking)', () => {
      it('confirmServiceRequest updates status to PROCESSED and locks subsequent Edit & Cancel operations', async () => {
        const originalFindUnique = prisma.serviceBooking.findUnique;
        const originalUpdate = prisma.serviceBooking.update;

        let bookingStatus = 'PENDING';
        prisma.serviceBooking.findUnique = async () => ({
          id: 'svc-lock-test-888',
          requestorId: 'user-auth-123',
          requestor: { id: 'user-auth-123', email: 'varsikurniawan@gmail.com' },
          status: bookingStatus,
          createdAt: new Date(),
          slots: [{ date: new Date('2026-11-20'), startTime: '10:00', endTime: '12:00' }],
        });

        prisma.serviceBooking.update = async ({ data }) => {
          bookingStatus = data.status;
          return {
            id: 'svc-lock-test-888',
            requestorId: 'user-auth-123',
            requestor: { id: 'user-auth-123', email: 'varsikurniawan@gmail.com' },
            status: data.status,
            slots: [{ date: new Date('2026-11-20'), startTime: '10:00', endTime: '12:00' }],
          };
        };

        try {
          const cancelSecret = process.env.JWT_SECRET || 'kalceria-service-cancel-fallback-secret';
          const validToken = jwt.sign(
            { bookingId: 'svc-lock-test-888', requestorId: 'user-auth-123', action: 'manage' },
            cancelSecret,
            { expiresIn: '3m', issuer: 'kalceria-api' }
          );

          // 1. Confirm booking -> status becomes PROCESSED
          const reqConfirm = {
            params: { id: 'svc-lock-test-888' },
            body: { bookingId: 'svc-lock-test-888' },
            query: { token: validToken },
            get: (h) => (h === 'x-manage-token' || h === 'x-cancel-token' ? validToken : ''),
          };
          const resConfirm = createMockRes();
          await confirmServiceRequest(reqConfirm, resConfirm, () => {});

          assert.equal(resConfirm.statusCode, 200);
          assert.equal(resConfirm.body.isConfirmed, true);
          assert.equal(bookingStatus, 'PROCESSED');

          // 2. Idempotency: re-confirming already PROCESSED booking succeeds without error
          const resReconfirm = createMockRes();
          await confirmServiceRequest(reqConfirm, resReconfirm, () => {});
          assert.equal(resReconfirm.statusCode, 200);
          assert.equal(resReconfirm.body.isConfirmed, true);

          // 3. Super-Variable Lock: Edit attempt on confirmed booking is rejected with 403
          const reqEdit = {
            params: { id: 'svc-lock-test-888' },
            query: { booking_id: 'svc-lock-test-888', token: validToken },
            get: (h) => (h === 'x-manage-token' ? validToken : ''),
          };
          const resEdit = createMockRes();
          await getServiceRequestForEdit(reqEdit, resEdit, () => {});
          assert.equal(resEdit.statusCode, 403);
          assert.match(resEdit.body.error, /konfirmasi/i);

          // 4. Super-Variable Lock: Cancel attempt on confirmed booking is rejected with 403
          const reqCancel = {
            params: { id: 'svc-lock-test-888' },
            body: { bookingId: 'svc-lock-test-888', cancelToken: validToken },
            get: (h) => (h === 'x-cancel-token' ? validToken : ''),
          };
          const resCancel = createMockRes();
          await deleteOwnServiceRequest(reqCancel, resCancel, () => {});
          assert.equal(resCancel.statusCode, 403);
          assert.match(resCancel.body.error, /konfirmasi/i);
        } finally {
          prisma.serviceBooking.findUnique = originalFindUnique;
          prisma.serviceBooking.update = originalUpdate;
        }
      });
    });

    describe('4.3. Lazy Expiration Purge Protocol', () => {
      it('purgeExpiredUnconfirmedServiceBookings deletes unconfirmed PENDING bookings older than 3 minutes', async () => {
        const originalDeleteMany = prisma.serviceBooking.deleteMany;
        let deleteFilter = null;

        prisma.serviceBooking.deleteMany = async ({ where }) => {
          deleteFilter = where;
          return { count: 3 };
        };

        try {
          const count = await purgeExpiredUnconfirmedServiceBookings();
          assert.equal(count, 3);
          assert.equal(deleteFilter.status, 'PENDING');
          assert.ok(deleteFilter.createdAt.lt instanceof Date);
        } finally {
          prisma.serviceBooking.deleteMany = originalDeleteMany;
        }
      });
    });
  });

  after(async () => {
    try {
      if (redis?.disconnect) redis.disconnect();
    } catch {}
  });
});
