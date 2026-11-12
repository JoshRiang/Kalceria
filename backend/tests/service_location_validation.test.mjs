import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { redis } from '../lib/redis.js';
import {
  isValidIndonesianLocation,
  searchIndonesianLocations,
  reverseGeocodeLocation,
  buildIndonesianSearchCandidates,
  signLocationToken,
  isWithinIndonesiaBounds,
  isLocationFromVerifiedList,
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
  registerEvent,
  checkEventEmailRegistration,
  buildEventRegistrationWaMessage,
  getEventRegistrationForManage,
  confirmEventRegistration,
  deleteOwnEventRegistration,
  purgeExpiredUnconfirmedEventRegistrations,
} from '../controllers/eventRegistrationController.js';
import { renderTimerBadgeSvg, renderTimerBadgeGif } from '../controllers/comms/timerBadgeRenderer.js';
import {
  checkEventRegistrationDefense,
  setEventRegistrationCooldown,
  clearEventRegistrationCooldown,
  checkServiceBookingDefense,
  setServiceBookingCooldown,
  clearServiceBookingCooldown,
} from '../middleware/ingressDefense.js';
import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import {
  buildServiceRequestSubmittedEmailHtml,
  buildServiceRequestUpdatedEmailHtml,
  buildServiceRequestConfirmedEmailHtml,
  buildEventRegistrationEmailHtml,
  buildEventPaymentConfirmedEmailHtml,
} from '../lib/mailer.js';

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

describe('Service Request: Comms Channel & Location Verification', () => {
  describe('1. Phone Number / Comms Channel Regex & Operator Validation', () => {
    const INDO_MOBILE_REGEX = /^8(?:1[1-9]|2[1-3]|3[1238]|5[1-35-9]|7[78]|8[1-9]|9[5-9])\d{6,10}$/;
    const REPEATING_DIGITS_REGEX = /(\d)\1{6,}/;

    it('accepts valid Indonesian mobile numbers across major operators (Telkomsel, Indosat, XL, Tri)', () => {
      const validNumbers = [
        '+6281234567890', // Telkomsel
        '+6281512345678', // Indosat
        '+6281712345678', // XL
        '+6289612345678', // Tri
        '+6288112345678', // Smartfren
        '+6282112345678', // Telkomsel
        '+6283812345678', // Axis
      ];

      for (const num of validNumbers) {
        const digits = num.replace(/^\+?62/, '').replace(/^0+/, '');
        assert.equal(num.startsWith('+62'), true);
        assert.equal(INDO_MOBILE_REGEX.test(digits), true, `${num} should be valid`);
        assert.equal(REPEATING_DIGITS_REGEX.test(digits), false);
      }
    });

    it('rejects invalid numbers, gibberish (e.g. 645645465), fake operators, and repeating digits', () => {
      const invalidNumbers = [
        '645645465',       // User screenshot gibberish
        '+62645645465',    // Doesn't start with 8
        '+62801234567',    // 80x is not a valid operator prefix
        '+62841234567',    // 84x is not valid
        '+62812',          // Too short (< 9 digits)
        '+62812345678901234', // Too long (> 12 digits after +62)
        '081234567890',    // Missing +62
        '+628111111111',   // Repeating spam digits
        'abcde123456',     // Non-numeric
      ];

      for (const num of invalidNumbers) {
        const digits = num.replace(/^\+?62/, '').replace(/^0+/, '');
        const valid = num.startsWith('+62') && INDO_MOBILE_REGEX.test(digits) && !REPEATING_DIGITS_REGEX.test(digits);
        assert.equal(valid, false, `${num} should be invalid`);
      }
    });
  });

  describe('2. Indonesian Address Normalization & Candidates', () => {
    it('normalizes noisy Indonesian address and extracts core street name', () => {
      const raw = 'Perumahan Azul, Jl Swadarma Raya, RT/RW 02/05, No. 14';
      const candidates = buildIndonesianSearchCandidates(raw);

      assert.ok(Array.isArray(candidates));
      assert.ok(candidates.length > 0);
      assert.ok(
        candidates.some((c) => c.toLowerCase().includes('jalan swadarma raya')),
        `Expected "Jalan Swadarma Raya" in candidates: ${JSON.stringify(candidates)}`
      );
    });

    it('expands shortcut "Jl" into "Jalan Raya" candidate', () => {
      const candidates = buildIndonesianSearchCandidates('Jl');
      assert.deepEqual(candidates, ['Jalan Raya']);
    });
  });

  describe('3. Cryptographic Token & Indonesian Bounds Validation', () => {
    it('correctly validates geographic coordinates within Indonesian bounds', () => {
      assert.equal(isWithinIndonesiaBounds(-6.2088, 106.8456), true); // Jakarta
      assert.equal(isWithinIndonesiaBounds(-7.2575, 112.7521), true); // Surabaya
      assert.equal(isWithinIndonesiaBounds(35.6762, 139.6503), false); // Tokyo (out of bounds)
      assert.equal(isWithinIndonesiaBounds(51.5074, -0.1278), false); // London (out of bounds)
    });

    it('signs and verifies location selectionToken with HMAC-SHA256', () => {
      const loc = 'Jl. Swadarma Raya, Jakarta Selatan, DKI Jakarta';
      const token = signLocationToken(loc, -6.22, 106.8);
      assert.ok(typeof token === 'string' && token.length === 64);

      // Verified via token
      assert.equal(isValidIndonesianLocation({ formatted: loc, lat: -6.22, lon: 106.8, selectionToken: token }), true);

      // Tampered token fails
      assert.equal(isValidIndonesianLocation({ formatted: loc, lat: -6.22, lon: 106.8, selectionToken: 'tampered-token' }), false);
    });

    it('validates verified streets, cities, and all 38 Indonesian provinces (stopping at province)', () => {
      const validLocations = [
        'Jl. Margonda Raya, Kota Depok, Jawa Barat',
        'Jl. Jenderal Sudirman, Jakarta Selatan, DKI Jakarta',
        'Jl. Asia Afrika, Kota Bandung, Jawa Barat',
        'Jl. Malioboro, Kota Yogyakarta, Daerah Istimewa Yogyakarta',
        'Jl. Sunset Road, Kabupaten Badung, Bali',
        'Kota Surabaya, Jawa Timur',
        'Kota Medan, Sumatera Utara',
        'DKI Jakarta',
        'Jawa Barat',
        'Bali',
      ];

      for (const loc of validLocations) {
        assert.equal(isValidIndonesianLocation(loc), true, `${loc} should be valid`);
      }
    });

    it('rejects random gibberish (e.g. Jwhshennd) or arbitrary non-Indonesian strings', () => {
      const invalidLocations = [
        'Jwhshennd',      // User screenshot gibberish
        'asdfghjkl',
        'test12345',
        'Random Place Somewhere',
        'New York, USA',
        'London, UK',
        '12345',
      ];

      for (const loc of invalidLocations) {
        assert.equal(isValidIndonesianLocation(loc), false, `${loc} should be invalid`);
      }
    });

    it('contains all 38 official provinces of Indonesia', () => {
      assert.equal(INDONESIAN_PROVINCES.length, 38);
      assert.ok(INDONESIAN_PROVINCES.includes('DKI Jakarta'));
      assert.ok(INDONESIAN_PROVINCES.includes('Jawa Barat'));
      assert.ok(INDONESIAN_PROVINCES.includes('Papua Barat'));
    });
  });

  describe('4. Location Autocomplete Search & Reverse Geocode API', () => {
    it('returns verified suggestions for query "Jl" or "Margonda"', async () => {
      const req = { query: { q: 'Margonda' } };
      const res = createMockRes();

      await searchIndonesianLocations(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.results));
      assert.ok(res.body.results.length > 0);
      assert.ok(
        res.body.results.some((r) => /Jawa Barat/i.test(r.formatted) || /Depok/i.test(r.formatted)),
        'Expected at least one result with Jawa Barat or Depok'
      );
    });

    it('returns empty results for queries with less than 2 characters', async () => {
      const req = { query: { q: 'a' } };
      const res = createMockRes();

      await searchIndonesianLocations(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body.results, []);
    });

    it('handles reverse geocoding with coordinates fallback', async () => {
      const req = { query: { lat: '-6.3728', lng: '106.8317' } };
      const res = createMockRes();

      await reverseGeocodeLocation(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(res.body.formatted);
      assert.match(res.body.formatted, /Jawa Barat/i);
    });
  });

  describe('5. Backend createServiceRequest Endpoint Hardening', () => {
    it('rejects service request in "user" mode when unauthenticated with 401 Login First.', async () => {
      const req = {
        body: {
          mode: 'user',
          serviceType: 'EO',
          serviceName: 'Valid Event Name',
          contactPerson: 'Jawa Operator',
          whatsapp: '+6281234567890',
          location: 'Jl. Margonda Raya, Kota Depok, Jawa Barat',
          slots: [{ date: '2026-11-05', startTime: '10:00', endTime: '11:00' }],
        },
      };
      const res = createMockRes();

      await createServiceRequest(req, res, () => {});

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.error, 'Login First.');
    });

    it('rejects service request with invalid phone number (e.g. 645645465) with 400 Bad Request', async () => {
      const req = {
        body: {
          serviceType: 'EO',
          serviceName: 'Valid Event Name',
          contactPerson: 'Jawa Operator',
          whatsapp: '645645465', // GIBBERISH PHONE
          location: 'Jl. Margonda Raya, Kota Depok, Jawa Barat',
          slots: [{ date: '2026-11-05', startTime: '10:00', endTime: '11:00' }],
        },
      };
      const res = createMockRes();

      await createServiceRequest(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /Indonesian WhatsApp/i);
    });

    it('rejects service request with gibberish deployment area (e.g. Jwhshennd) with 400 Bad Request', async () => {
      const req = {
        body: {
          serviceType: 'EO',
          serviceName: 'Valid Event Name',
          contactPerson: 'Jawa Operator',
          whatsapp: '+6281234567890',
          location: 'Jwhshennd', // GIBBERISH LOCATION
          slots: [{ date: '2026-11-05', startTime: '10:00', endTime: '11:00' }],
        },
      };
      const res = createMockRes();

      await createServiceRequest(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /Indonesian deployment area/i);
    });

    it('rejects service request with missing or invalid email address with 400 Bad Request', async () => {
      const reqInvalid = {
        body: {
          serviceType: 'EO',
          serviceName: 'Valid Event Name',
          contactPerson: 'Jawa Operator',
          whatsapp: '+6281234567890',
          email: 'not-an-email',
          location: 'Jl. Margonda Raya, Kota Depok, Jawa Barat',
          slots: [{ date: '2026-11-05', startTime: '10:00', endTime: '11:00' }],
        },
      };
      const resInvalid = createMockRes();

      await createServiceRequest(reqInvalid, resInvalid, () => {});

      assert.equal(resInvalid.statusCode, 400);
      assert.match(resInvalid.body.error, /valid email address/i);

      const reqMissing = {
        body: {
          serviceType: 'EO',
          serviceName: 'Valid Event Name',
          contactPerson: 'Jawa Operator',
          whatsapp: '+6281234567890',
          location: 'Jl. Margonda Raya, Kota Depok, Jawa Barat',
          slots: [{ date: '2026-11-05', startTime: '10:00', endTime: '11:00' }],
        },
      };
      const resMissing = createMockRes();

      await createServiceRequest(reqMissing, resMissing, () => {});

      assert.equal(resMissing.statusCode, 400);
      assert.match(resMissing.body.error, /valid email address/i);
    });
  });

  describe('6. Service Request WhatsApp Formatting & 15-Minute Management Lifecycle', () => {
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

      // Verify ZERO emojis in message
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      assert.equal(emojiRegex.test(msg), false, 'Message must not contain any emojis');
    });

    it('getServiceRequestForEdit allows access within 3 minutes and returns remainingSeconds', async () => {
      const originalFindUnique = prisma.serviceBooking.findUnique;
      const recentCreatedAt = new Date(Date.now() - 1 * 60 * 1000); // 1 min ago (< 3 mins)
      prisma.serviceBooking.findUnique = async () => ({
        id: 'booking-edit-1',
        serviceType: 'EO',
        serviceName: 'Track Day',
        contactPerson: 'Ditya',
        whatsapp: '+6281234567890',
        location: 'Sentul Circuit, Jawa Barat',
        additionalNotes: 'Need sound system',
        createdAt: recentCreatedAt,
        requestorId: 'user-auth-123',
        requestor: { id: 'user-auth-123', email: 'ditya@kalceria.com' },
        slots: [{ date: new Date('2026-11-25'), startTime: '09:00', endTime: '12:00' }],
      });

      try {
        const req = {
          params: { id: 'booking-edit-1' },
          user: { userId: 'user-auth-123' },
          get: () => '',
        };
        const res = createMockRes();

        await getServiceRequestForEdit(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.ok(res.body.booking);
        assert.equal(res.body.booking.serviceName, 'Track Day');
        assert.ok(res.body.remainingSeconds > 60);
      } finally {
        prisma.serviceBooking.findUnique = originalFindUnique;
      }
    });

    it('getServiceRequestForEdit rejects with 403 when 3-minute window has expired', async () => {
      const originalFindUnique = prisma.serviceBooking.findUnique;
      const expiredCreatedAt = new Date(Date.now() - 4 * 60 * 1000); // 4 mins ago (> 3 mins)
      prisma.serviceBooking.findUnique = async () => ({
        id: 'booking-edit-expired',
        serviceType: 'EO',
        serviceName: 'Track Day',
        contactPerson: 'Ditya',
        whatsapp: '+6281234567890',
        location: 'Sentul Circuit, Jawa Barat',
        createdAt: expiredCreatedAt,
        requestorId: 'user-auth-123',
        requestor: { id: 'user-auth-123', email: 'ditya@kalceria.com' },
        slots: [],
      });

      try {
        const req = {
          params: { id: 'booking-edit-expired' },
          user: { userId: 'user-auth-123' },
          get: () => '',
        };
        const res = createMockRes();

        await getServiceRequestForEdit(req, res, () => {});

        assert.equal(res.statusCode, 403);
        assert.match(res.body.error, /3 menit/i);
      } finally {
        prisma.serviceBooking.findUnique = originalFindUnique;
      }
    });

    it('deleteOwnServiceRequest rejects cancellation with 403 when 3-minute window has expired', async () => {
      const originalFindUnique = prisma.serviceBooking.findUnique;
      const expiredCreatedAt = new Date(Date.now() - 4 * 60 * 1000); // 4 mins ago (> 3 mins)
      prisma.serviceBooking.findUnique = async () => ({
        id: 'booking-cancel-expired',
        createdAt: expiredCreatedAt,
        requestorId: 'user-auth-123',
        requestor: { id: 'user-auth-123', email: 'ditya@kalceria.com' },
      });

      try {
        const req = {
          params: { id: 'booking-cancel-expired' },
          user: { userId: 'user-auth-123' },
          get: () => '',
        };
        const res = createMockRes();

        await deleteOwnServiceRequest(req, res, () => {});

        assert.equal(res.statusCode, 403);
        assert.match(res.body.error, /3 menit/i);
      } finally {
        prisma.serviceBooking.findUnique = originalFindUnique;
      }
    });

    it('buildServiceRequestSubmittedEmailHtml includes favicon logo, metadata, 3-minute policy, and Magic Link styled Edit/Cancel buttons', () => {
      const mockBooking = {
        id: 'svc-test-uuid-999888',
        serviceType: 'EO',
        serviceName: 'Automotive Track Meet',
        contactPerson: 'Reinathan',
        whatsapp: '+628117998790',
        location: 'Jl. Margonda Raya, Depok, Jawa Barat',
        additionalNotes: 'Need marshall and timing gear',
      };
      const mockSlots = [
        { date: '2026-11-20', startTime: '09:00', endTime: '14:00' },
      ];
      const mockToken = 'mock-jwt-manage-token';

      const html = buildServiceRequestSubmittedEmailHtml({
        booking: mockBooking,
        slots: mockSlots,
        cancelToken: mockToken,
      });

      // 1. Icon / Favicon logo (Seamless transparent favicon without black squircle)
      assert.match(html, /https:\/\/www\.kalceria\.id\/favicon\.png/);

      // 2. Metadata table
      assert.match(html, /Booking ID/);
      assert.match(html, /#999888/);
      assert.match(html, /Event Organizer/);
      assert.match(html, /Automotive Track Meet/);
      assert.match(html, /Reinathan/);
      assert.match(html, /\+628117998790/);
      assert.match(html, /Jl\. Margonda Raya/);

      // 3. 3-minute standard policy notice
      assert.match(html, /Batas Waktu Perubahan \(3 Menit\)/);
      assert.match(html, /mengedit parameter atau membatalkan pesanan dalam kurun waktu 3 menit/);

      // 4. Action buttons: Confirm, Edit, and Cancel matching Magic Link button shape & font
      assert.match(html, />CONFIRM</);
      assert.match(html, />EDIT</);
      assert.match(html, />CANCEL</);
      assert.match(html, /border-radius:(?:6|8)px/);
      assert.match(html, /letter-spacing:0\.5px/);
      assert.match(html, /service_action=confirm&booking_id=svc-test-uuid-999888&token=mock-jwt-manage-token/);
      assert.match(html, /service_action=edit&booking_id=svc-test-uuid-999888&token=mock-jwt-manage-token/);
      assert.match(html, /service_action=cancel&booking_id=svc-test-uuid-999888&token=mock-jwt-manage-token/);
    });

    it('candidate buffer formats clean preview message before backend DB insertion', () => {
      const candidateBooking = {
        serviceType: 'SHOOTING',
        serviceName: 'Rolling Shot Sunset',
        contactPerson: 'Reinathan',
        whatsapp: '+628117998790',
        location: 'Jl. Margonda Raya, Depok, Jawa Barat',
        additionalNotes: 'Smoke machine on set',
      };
      const candidateSlots = [
        { date: '2026-11-22', startTime: '16:00', endTime: '18:00' },
      ];

      // In Part 3 before WA click, booking.id is null (buffered candidate)
      const msg = buildServiceRequestWaMessage(
        candidateBooking,
        candidateSlots,
        candidateBooking.contactPerson,
        candidateBooking.whatsapp,
        candidateBooking.location,
        candidateBooking.additionalNotes,
        'Reinathan (Candidate)'
      );

      assert.match(msg, /Booking ID: #NEW/);
      assert.match(msg, /Service: Shooting \/ Production/);
      assert.match(msg, /Rolling Shot Sunset/);
      assert.match(msg, /\+628117998790/);
      assert.match(msg, /16:00 - 18:00/);
      // Strict constraint: zero emojis in entire message
      assert.doesNotMatch(msg, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
    });

    it('buildServiceRequestUpdatedEmailHtml contains Ringkasan Update, zero Edit button, active Cancel button, and 3-minute unified policy', () => {
      const updatedBooking = {
        id: 'svc-test-uuid-updated-123',
        serviceType: 'EO',
        serviceName: 'Automotive Track Meet (Updated)',
        contactPerson: 'Reinathan',
        whatsapp: '+628117998790',
        location: 'Jl. Margonda Raya, Depok, Jawa Barat',
        additionalNotes: 'Added 2 marshall cars',
      };
      const updatedSlots = [
        { date: '2026-11-25', startTime: '10:00', endTime: '16:00' },
      ];
      const newCancelToken = 'mock-new-cancel-jwt-token';

      const html = buildServiceRequestUpdatedEmailHtml({
        booking: updatedBooking,
        slots: updatedSlots,
        cancelToken: newCancelToken,
      });

      // 1. Logo Favicon (Seamless transparent favicon without black squircle)
      assert.match(html, /https:\/\/www\.kalceria\.id\/favicon\.png/);

      // 2. Ringkasan Update title
      assert.match(html, /Ringkasan Update: Need Our Help/);
      assert.match(html, /Updated Booking Details/);
      assert.match(html, /Automotive Track Meet \(Updated\)/);
      assert.match(html, /Added 2 marshall cars/);

      // 3. Strict constraint: NO Edit button allowed in update summary email
      assert.doesNotMatch(html, />EDIT</);

      // 4. Strict constraint: Confirm and Cancel buttons MUST be present with Magic Link style
      assert.match(html, />CONFIRM</);
      assert.match(html, />CANCEL</);
      assert.match(html, /border-radius:(?:6|8)px/);
      assert.match(html, /Batas Waktu Pembatalan \(3 Menit Terpadu\)/);
      assert.match(html, /service_action=confirm&booking_id=svc-test-uuid-updated-123&token=mock-new-cancel-jwt-token/);
      assert.match(html, /service_action=cancel&booking_id=svc-test-uuid-updated-123&token=mock-new-cancel-jwt-token/);
    });

    it('buildServiceRequestWaMessage formats UPDATE PESANAN header when isUpdate is true', () => {
      const updatedBooking = {
        id: 'svc-test-uuid-updated-456',
        serviceType: 'HOST_EVENT',
        serviceName: 'Car Meetup Party',
        contactPerson: 'Reinathan',
        whatsapp: '+628117998790',
        location: 'Jl. Margonda Raya, Depok, Jawa Barat',
        additionalNotes: 'Sound system needed',
      };
      const updatedSlots = [
        { date: '2026-11-26', startTime: '18:00', endTime: '22:00' },
      ];

      const msg = buildServiceRequestWaMessage(
        updatedBooking,
        updatedSlots,
        updatedBooking.contactPerson,
        updatedBooking.whatsapp,
        updatedBooking.location,
        updatedBooking.additionalNotes,
        'Reinathan',
        true // isUpdate
      );

      // Must start with UPDATE PESANAN - NEED OUR HELP
      assert.match(msg, /^UPDATE PESANAN - NEED OUR HELP/);
      assert.match(msg, /Booking ID: #ed-456/);
      assert.match(msg, /Service: Host Event/);
      assert.match(msg, /Car Meetup Party/);
      // Zero emojis
      assert.doesNotMatch(msg, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
    });

    it('updateServiceRequest replaces old booking entry and mints new cancelToken in single atomic transaction', async () => {
      const originalFindUnique = prisma.serviceBooking.findUnique;
      const originalTransaction = prisma.$transaction;

      let deletedId = null;
      let createdData = null;
      const initialCreatedAt = new Date(Date.now() - 1 * 60 * 1000); // 1 min ago (< 3 mins)

      prisma.serviceBooking.findUnique = async () => ({
        id: 'svc-old-booking-id',
        createdAt: initialCreatedAt,
        requestorId: 'user-auth-123',
        serviceType: 'EO',
        serviceName: 'Original Title',
        contactPerson: 'Reinathan',
        whatsapp: '+628117998790',
        location: 'Jl. Margonda Raya, Depok, Jawa Barat',
        paymentStatus: 'PENDING',
        requestor: { id: 'user-auth-123', email: 'ditya@kalceria.com' },
      });

      prisma.$transaction = async (cb) => {
        const mockTx = {
          serviceBooking: {
            delete: async ({ where }) => {
              deletedId = where.id;
            },
            create: async ({ data }) => {
              createdData = data;
              return {
                id: 'svc-new-booking-id',
                ...data,
                requestor: { id: 'user-auth-123', email: 'ditya@kalceria.com' },
                slots: [
                  { date: new Date('2026-11-28'), startTime: '10:00', endTime: '12:00' }
                ],
              };
            },
          },
        };
        return cb(mockTx);
      };

      try {
        const req = {
          params: { id: 'svc-old-booking-id' },
          user: { userId: 'user-auth-123' },
          body: {
            serviceType: 'EO',
            serviceName: 'Updated Title',
            contactPerson: 'Reinathan Ezk',
            whatsapp: '+628117998790',
            location: 'Jl. Margonda Raya, Depok, Jawa Barat',
            slots: [
              { date: '2026-11-28', startTime: '10:00', endTime: '12:00' }
            ],
          },
          get: () => '',
        };
        const res = createMockRes();

        let nextErr = null;
        await updateServiceRequest(req, res, (err) => {
          nextErr = err;
        });

        if (nextErr) {
          throw nextErr;
        }

        assert.equal(res.statusCode, 200);
        assert.equal(deletedId, 'svc-old-booking-id');
        assert.equal(createdData.requestorId, 'user-auth-123');
        assert.equal(createdData.serviceName, 'Updated Title');
        assert.equal(createdData.createdAt.getTime(), initialCreatedAt.getTime()); // COUNTER NOT RESET!
        assert.ok(res.body.remainingSeconds <= 120 && res.body.remainingSeconds > 60);
        assert.equal(res.body.bookingId, 'svc-new-booking-id');
        assert.ok(res.body.cancelToken);
        assert.equal(res.body.userEmail, 'ditya@kalceria.com');
        assert.match(res.body.whatsappUrl, /UPDATE%20PESANAN%20-%20NEED%20OUR%20HELP/);
      } finally {
        prisma.serviceBooking.findUnique = originalFindUnique;
        prisma.$transaction = originalTransaction;
      }
    });

    it('buildServiceRequestSubmittedEmailHtml and buildServiceRequestUpdatedEmailHtml include Email row', () => {
      const mockBooking = {
        id: 'svc-uuid-abcdef-123456',
        serviceType: 'SHOOTING',
        serviceName: 'Automotive Rolling Shot',
        contactPerson: 'Reinathan',
        whatsapp: '+628117998790',
        location: 'Jl. Margonda Raya, Depok, Jawa Barat',
        requestor: { email: 'reinathan@kalceria.com' },
      };
      const submittedHtml = buildServiceRequestSubmittedEmailHtml({ booking: mockBooking, slots: [] });
      assert.match(submittedHtml, /reinathan@kalceria\.com/);
      assert.match(submittedHtml, />Email</);

      const updatedHtml = buildServiceRequestUpdatedEmailHtml({ booking: mockBooking, slots: [] });
      assert.match(updatedHtml, /reinathan@kalceria\.com/);
      assert.match(updatedHtml, />Email</);
    });

    describe('4. 2-Step Verification, Confirm Action, and Expiration Purge Protocol', () => {
      const mockBooking = {
        id: 'svc-uuid-confirm-123456',
        serviceType: 'SHOOTING',
        serviceName: 'Automotive Rolling Shot',
        contactPerson: 'Reinathan',
        whatsapp: '+628117998790',
        location: 'Jl. Swadarma Raya No. 14, Jakarta Selatan',
        requestor: { id: 'user-auth-123', email: 'reinathan@kalceria.com' },
      };

      it('Email #1 (Submitted) contains CONFIRM, EDIT, and CANCEL buttons and mandatory confirmation policy', () => {
        const html = buildServiceRequestSubmittedEmailHtml({ booking: mockBooking, slots: [], cancelToken: 'dummy-token' });
        assert.match(html, /CONFIRM/);
        assert.match(html, /EDIT/);
        assert.match(html, /CANCEL/);
        assert.match(html, /service_action=confirm/);
        assert.match(html, /service_action=edit/);
        assert.match(html, /service_action=cancel/);
        assert.match(html, /Konfirmasi Pesanan \(Wajib\)/);
      });

      it('Email #2 (Updated) contains CONFIRM and CANCEL buttons and mandatory confirmation policy', () => {
        const html = buildServiceRequestUpdatedEmailHtml({ booking: mockBooking, slots: [], cancelToken: 'dummy-token' });
        assert.match(html, /CONFIRM/);
        assert.match(html, /CANCEL/);
        assert.match(html, /service_action=confirm/);
        assert.match(html, /service_action=cancel/);
        assert.match(html, /Konfirmasi Pembaruan \(Wajib\)/);
        assert.doesNotMatch(html, /service_action=edit/);
      });

      it('Email #3 (Confirmed) contains order summary and NO BUTTONS AT ALL', () => {
        const html = buildServiceRequestConfirmedEmailHtml({ booking: mockBooking, slots: [] });
        assert.match(html, /Order Confirmed &amp; Persisted/);
        assert.match(html, /Final Booking Summary/);
        assert.match(html, /reinathan@kalceria\.com/);
        assert.match(html, /\+628117998790/);
        assert.doesNotMatch(html, /CONFIRM<\/a>/);
        assert.doesNotMatch(html, /EDIT<\/a>/);
        assert.doesNotMatch(html, /CANCEL<\/a>/);
        assert.doesNotMatch(html, /service_action=/);
      });

      it('confirmServiceRequest updates status to PROCESSED and persists the booking', async () => {
        const originalFindUnique = prisma.serviceBooking.findUnique;
        const originalUpdate = prisma.serviceBooking.update;

        let updatedStatus = null;
        prisma.serviceBooking.findUnique = async () => ({
          ...mockBooking,
          createdAt: new Date(),
          status: 'PENDING',
          requestorId: 'user-auth-123',
          slots: [],
        });
        prisma.serviceBooking.update = async ({ data }) => {
          updatedStatus = data.status;
          return {
            ...mockBooking,
            status: data.status,
            slots: [],
          };
        };

        try {
          const req = {
            params: { id: 'svc-uuid-confirm-123456' },
            user: { userId: 'user-auth-123' },
            get: () => '',
          };
          const res = createMockRes();

          await confirmServiceRequest(req, res, () => {});

          assert.equal(res.statusCode, 200);
          assert.equal(res.body.success, true);
          assert.equal(res.body.isConfirmed, true);
          assert.equal(updatedStatus, 'PROCESSED');
        } finally {
          prisma.serviceBooking.findUnique = originalFindUnique;
          prisma.serviceBooking.update = originalUpdate;
        }
      });

      it('confirmServiceRequest is idempotent if booking is already PROCESSED', async () => {
        const originalFindUnique = prisma.serviceBooking.findUnique;

        prisma.serviceBooking.findUnique = async () => ({
          ...mockBooking,
          createdAt: new Date(),
          status: 'PROCESSED',
          requestorId: 'user-auth-123',
          slots: [],
        });

        try {
          const req = {
            params: { id: 'svc-uuid-confirm-123456' },
            user: { userId: 'user-auth-123' },
            get: () => '',
          };
          const res = createMockRes();

          await confirmServiceRequest(req, res, () => {});

          assert.equal(res.statusCode, 200);
          assert.equal(res.body.isConfirmed, true);
        } finally {
          prisma.serviceBooking.findUnique = originalFindUnique;
        }
      });

      it('confirmed booking locks edit and cancel operations (Super-Variable Lock)', async () => {
        const originalFindUnique = prisma.serviceBooking.findUnique;

        prisma.serviceBooking.findUnique = async () => ({
          ...mockBooking,
          createdAt: new Date(),
          status: 'PROCESSED',
          requestorId: 'user-auth-123',
          slots: [],
        });

        try {
          const req = {
            params: { id: 'svc-uuid-confirm-123456' },
            user: { userId: 'user-auth-123' },
            body: { slots: [] },
            get: () => '',
          };

          // 1. Edit inspection
          const resEditInspect = createMockRes();
          await getServiceRequestForEdit(req, resEditInspect, () => {});
          assert.equal(resEditInspect.statusCode, 403);
          assert.equal(resEditInspect.body.isConfirmed, true);

          // 2. Update attempt
          const resUpdate = createMockRes();
          await updateServiceRequest(req, resUpdate, () => {});
          assert.equal(resUpdate.statusCode, 403);
          assert.equal(resUpdate.body.isConfirmed, true);

          // 3. Cancel attempt
          const resCancel = createMockRes();
          await deleteOwnServiceRequest(req, resCancel, () => {});
          assert.equal(resCancel.statusCode, 403);
          assert.equal(resCancel.body.isConfirmed, true);
        } finally {
          prisma.serviceBooking.findUnique = originalFindUnique;
        }
      });

      it('unconfirmed booking is purged from DB if 3 minutes expire without confirmation', async () => {
        const originalFindUnique = prisma.serviceBooking.findUnique;
        const originalDelete = prisma.serviceBooking.delete;

        let deletedId = null;
        const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);

        prisma.serviceBooking.findUnique = async () => ({
          ...mockBooking,
          createdAt: fourMinutesAgo,
          status: 'PENDING',
          requestorId: 'user-auth-123',
          slots: [],
        });
        prisma.serviceBooking.delete = async ({ where }) => {
          deletedId = where.id;
        };

        try {
          const req = {
            params: { id: 'svc-uuid-confirm-123456' },
            user: { userId: 'user-auth-123' },
            get: () => '',
          };

          // Calling confirm after expiration deletes unconfirmed booking
          const resConfirm = createMockRes();
          await confirmServiceRequest(req, resConfirm, () => {});
          assert.equal(resConfirm.statusCode, 403);
          assert.equal(resConfirm.body.isExpired, true);
          assert.equal(deletedId, 'svc-uuid-confirm-123456');

          // Calling edit after expiration also triggers deletion of unconfirmed booking
          deletedId = null;
          const resEdit = createMockRes();
          await getServiceRequestForEdit(req, resEdit, () => {});
          assert.equal(resEdit.statusCode, 403);
          assert.equal(resEdit.body.isExpired, true);
          assert.equal(deletedId, 'svc-uuid-confirm-123456');
        } finally {
          prisma.serviceBooking.findUnique = originalFindUnique;
          prisma.serviceBooking.delete = originalDelete;
        }
      });

      it('purgeExpiredUnconfirmedServiceBookings helper deletes unconfirmed PENDING bookings older than 3 minutes', async () => {
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

    describe('See Event - 2-Step Verification & Registration Lifecycle', () => {
      const mockEvent = {
        id: 'evt-neon-test-1',
        title: 'Neon Horizon Night Meet',
        displayPhotoUrl: '/event_1.webp',
        location: 'Jakarta Neon Track',
        price: 150000,
      };

      const mockReg = {
        id: 'reg-uuid-test-999',
        eventId: 'evt-neon-test-1',
        userId: 'user-auth-123',
        selectedSession: 'Night Drive 20:00',
        paymentStatus: 'PENDING',
        createdAt: new Date(),
        event: mockEvent,
        user: {
          id: 'user-auth-123',
          name: 'Speed Hunter',
          email: 'speed@kalceria.id',
          phone: '+628123456789',
        },
      };

      it('buildEventRegistrationEmailHtml renders order summary, poster photo, 3-min policy, and magic link buttons', () => {
        const html = buildEventRegistrationEmailHtml({
          event: mockEvent,
          registration: mockReg,
          cancelToken: 'sample-jwt-token-123',
        });

        assert.match(html, /Neon Horizon Night Meet/);
        assert.match(html, /Night Drive 20:00/);
        assert.match(html, /Speed Hunter/);
        assert.match(html, /speed@kalceria\.id/);
        assert.match(html, /150\.000/);
        assert.match(html, /event_1\.webp/);
        assert.match(html, /Ketentuan Waktu &amp; Pembatalan \(3 Menit\)/);
        assert.match(html, />CONFIRM</);
        assert.match(html, />CANCEL</);
        assert.match(html, /event_action=confirm&registration_id=reg-uuid-test-999/);
        assert.match(html, /event_action=cancel&registration_id=reg-uuid-test-999/);
      });

      it('buildEventPaymentConfirmedEmailHtml renders poster, confirmed badge, and zero action buttons', () => {
        const html = buildEventPaymentConfirmedEmailHtml({
          event: mockEvent,
          registration: { ...mockReg, paymentStatus: 'CONFIRMED' },
        });

        assert.match(html, /Neon Horizon Night Meet/);
        assert.match(html, /event_1\.webp/);
        assert.match(html, /Status: Terkonfirmasi &amp; Terkunci/);
        assert.match(html, /CONFIRMED/);
        assert.doesNotMatch(html, />CONFIRM</);
        assert.doesNotMatch(html, />CANCEL</);
      });

      it('confirmEventRegistration persists registration to CONFIRMED, decrements event quota by 1, and is idempotent', async () => {
        const originalFindUnique = prisma.eventRegistration.findUnique;
        const originalTransaction = prisma.$transaction;

        let updatedStatus = null;
        let quotaDecrementedCount = 0;
        let decrementedQuotaEventId = null;

        prisma.eventRegistration.findUnique = async () => ({ ...mockReg });
        prisma.$transaction = async (cb) => {
          const mockTx = {
            eventRegistration: {
              update: async ({ data }) => {
                updatedStatus = data.paymentStatus;
                return { ...mockReg, paymentStatus: data.paymentStatus };
              },
            },
            event: {
              updateMany: async ({ where, data }) => {
                decrementedQuotaEventId = where.id;
                if (data.quota?.decrement) {
                  quotaDecrementedCount += data.quota.decrement;
                }
                return { count: 1 };
              },
            },
          };
          return cb(mockTx);
        };

        try {
          const req = {
            params: { id: mockReg.id },
            user: { userId: 'user-auth-123' },
            get: () => '',
          };
          const res = createMockRes();

          await confirmEventRegistration(req, res, () => {});
          assert.equal(res.statusCode, 200);
          assert.equal(res.body.success, true);
          assert.equal(res.body.isConfirmed, true);
          assert.equal(updatedStatus, 'CONFIRMED');
          assert.equal(decrementedQuotaEventId, mockReg.eventId);
          assert.equal(quotaDecrementedCount, 1);

          // Idempotency: Calling confirm when already CONFIRMED succeeds without error and does NOT double-decrement quota
          prisma.eventRegistration.findUnique = async () => ({ ...mockReg, paymentStatus: 'CONFIRMED' });
          const resIdempotent = createMockRes();
          await confirmEventRegistration(req, resIdempotent, () => {});
          assert.equal(resIdempotent.statusCode, 200);
          assert.equal(resIdempotent.body.isConfirmed, true);
          assert.equal(quotaDecrementedCount, 1); // Quota count remains 1, no duplicate decrement!
        } finally {
          prisma.eventRegistration.findUnique = originalFindUnique;
          prisma.$transaction = originalTransaction;
        }
      });

      it('deleteOwnEventRegistration cancels pending registration within 3 minutes, but rejects confirmed orders', async () => {
        const originalFindUnique = prisma.eventRegistration.findUnique;
        const originalDelete = prisma.eventRegistration.delete;

        let deletedId = null;
        prisma.eventRegistration.findUnique = async () => ({ ...mockReg, paymentStatus: 'PENDING' });
        prisma.eventRegistration.delete = async ({ where }) => {
          deletedId = where.id;
        };

        try {
          const req = {
            params: { id: mockReg.id },
            user: { userId: 'user-auth-123' },
            get: () => '',
          };
          const res = createMockRes();

          await deleteOwnEventRegistration(req, res, () => {});
          assert.equal(res.statusCode, 200);
          assert.equal(deletedId, mockReg.id);

          // Rejects cancellation if already confirmed (Super-variable lock)
          prisma.eventRegistration.findUnique = async () => ({ ...mockReg, paymentStatus: 'CONFIRMED' });
          const resConfirmedCancel = createMockRes();
          await deleteOwnEventRegistration(req, resConfirmedCancel, () => {});
          assert.equal(resConfirmedCancel.statusCode, 403);
          assert.equal(resConfirmedCancel.body.isConfirmed, true);
        } finally {
          prisma.eventRegistration.findUnique = originalFindUnique;
          prisma.eventRegistration.delete = originalDelete;
        }
      });

      it('purges unconfirmed registration if 3 minutes have elapsed', async () => {
        const originalFindUnique = prisma.eventRegistration.findUnique;
        const originalDelete = prisma.eventRegistration.delete;

        let deletedId = null;
        const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
        prisma.eventRegistration.findUnique = async () => ({
          ...mockReg,
          createdAt: fourMinutesAgo,
          paymentStatus: 'PENDING',
        });
        prisma.eventRegistration.delete = async ({ where }) => {
          deletedId = where.id;
        };

        try {
          const req = {
            params: { id: mockReg.id },
            user: { userId: 'user-auth-123' },
            get: () => '',
          };

          const resManage = createMockRes();
          await getEventRegistrationForManage(req, resManage, () => {});
          assert.equal(resManage.statusCode, 403);
          assert.equal(resManage.body.isExpired, true);
          assert.equal(deletedId, mockReg.id);
        } finally {
          prisma.eventRegistration.findUnique = originalFindUnique;
          prisma.eventRegistration.delete = originalDelete;
        }
      });

      it('purgeExpiredUnconfirmedEventRegistrations deletes unconfirmed registrations older than 3 minutes', async () => {
        const originalDeleteMany = prisma.eventRegistration.deleteMany;

        let deleteFilter = null;
        prisma.eventRegistration.deleteMany = async ({ where }) => {
          deleteFilter = where;
          return { count: 5 };
        };

        try {
          const count = await purgeExpiredUnconfirmedEventRegistrations();
          assert.equal(count, 5);
          assert.equal(deleteFilter.paymentStatus, 'PENDING');
          assert.ok(deleteFilter.createdAt.lt instanceof Date);
        } finally {
          prisma.eventRegistration.deleteMany = originalDeleteMany;
        }
      });

      it('registerEvent rejects public/guest submissions with invalid email', async () => {
        const req = {
          params: { eventId: mockEvent.id },
          body: {
            name: 'Public Participant',
            email: 'not-an-email',
            contact: '+628123456789',
            selectedSession: 'Night Drive 20:00',
          },
        };
        const res = createMockRes();

        await registerEvent(req, res, () => {});
        assert.equal(res.statusCode, 400);
        assert.match(res.body.error, /Email/i);
      });

      it('checkEventRegistrationDefense enforces cooldown on email address to prevent flooding', async () => {
        const fakeReq = {
          ip: '198.51.100.44',
          get: (h) => (h === 'x-forwarded-for' ? '198.51.100.44' : ''),
          params: { eventId: 'evt-flood-test' },
          body: {
            email: 'flooder@target.test',
          },
        };

        // 1. Initial request passes defense
        let passed = false;
        const res1 = createMockRes();
        await checkEventRegistrationDefense(fakeReq, res1, () => { passed = true; });
        assert.equal(passed, true);

        // 2. Set cooldown for this email
        await setEventRegistrationCooldown(fakeReq, 'evt-flood-test', null, 'flooder@target.test');

        // 3. Subsequent request with same email is blocked with 429
        passed = false;
        const res2 = createMockRes();
        await checkEventRegistrationDefense(fakeReq, res2, () => { passed = true; });
        assert.equal(passed, false);
        assert.equal(res2.statusCode, 429);
        assert.match(res2.body.error, /cooldown active/i);

        // 4. Clearing cooldown releases the restriction
        await clearEventRegistrationCooldown(fakeReq, 'evt-flood-test', null, 'flooder@target.test');
        passed = false;
        const res3 = createMockRes();
        await checkEventRegistrationDefense(fakeReq, res3, () => { passed = true; });
        assert.equal(passed, true);
      });

      it('checkServiceBookingDefense enforces cooldown on email address to prevent spam flooding', async () => {
        const fakeReq = {
          ip: '198.51.100.55',
          get: (h) => (h === 'x-forwarded-for' ? '198.51.100.55' : ''),
          body: {
            email: 'spammer-svc@target.test',
          },
        };

        // 1. Initial request passes defense
        let passed = false;
        const res1 = createMockRes();
        await checkServiceBookingDefense(fakeReq, res1, () => { passed = true; });
        assert.equal(passed, true);

        // 2. Set cooldown for this email
        await setServiceBookingCooldown(fakeReq, null, 'spammer-svc@target.test');

        // 3. Subsequent request with same email is blocked with 429
        passed = false;
        const res2 = createMockRes();
        await checkServiceBookingDefense(fakeReq, res2, () => { passed = true; });
        assert.equal(passed, false);
        assert.equal(res2.statusCode, 429);
        assert.match(res2.body.error, /cooldown active/i);

        // 4. Clearing cooldown releases the restriction
        await clearServiceBookingCooldown(fakeReq, null, 'spammer-svc@target.test');
        passed = false;
        const res3 = createMockRes();
        await checkServiceBookingDefense(fakeReq, res3, () => { passed = true; });
        assert.equal(passed, true);
      });

      it('buildEventRegistrationWaMessage formats coherent event metadata with zero emojis and target admin', () => {
        const testEvent = {
          id: 'evt-track-day-1',
          title: 'Sentul Track Day Championship',
          location: 'Sentul International Circuit, Bogor',
          price: 350000,
        };
        const testReg = {
          id: 'reg-uuid-1234567890',
          selectedSession: 'Morning Session (08:00 - 12:00)',
          paymentStatus: 'PENDING',
          createdAt: new Date('2026-11-20T10:00:00Z'),
        };
        const testUser = {
          name: 'Varsha Kurniawan',
          email: 'varsikurniawan@gmail.com',
          phone: '+628117998790',
        };

        const msg = buildEventRegistrationWaMessage({
          event: testEvent,
          registration: testReg,
          user: testUser,
          paymentCheckoutUrl: 'https://checkout.xendit.co/v2/test-123',
        });

        // 1. Header & Identifiers
        assert.match(msg, /^PENDAFTARAN EVENT - SEE EVENT/);
        assert.match(msg, /Booking ID: #567890/);
        assert.match(msg, /Event: Sentul Track Day Championship/);
        assert.match(msg, /Sesi: Morning Session \(08:00 - 12:00\)/);

        // 2. Participant & Location
        assert.match(msg, /Nama Pendaftar: Varsha Kurniawan/);
        assert.match(msg, /Email Pendaftar: varsikurniawan@gmail\.com/);
        assert.match(msg, /WhatsApp Pendaftar: \+628117998790/);
        assert.match(msg, /Lokasi Event: Sentul International Circuit, Bogor/);

        // 3. Billing & Status
        assert.match(msg, /Total Tagihan: Rp 350\.000/);
        assert.match(msg, /Status Pendaftaran: PENDING \(Menunggu Konfirmasi Email\)/);
        assert.match(msg, /Link Pembayaran Online: https:\/\/checkout\.xendit\.co\/v2\/test-123/);
        assert.match(msg, /Catatan: Pendaftaran wajib dikonfirmasi via email pendaftar dalam batas waktu 3 menit/);

        // 4. Free event formatting
        const freeMsg = buildEventRegistrationWaMessage({
          event: { ...testEvent, price: 0 },
          registration: testReg,
          user: testUser,
        });
        assert.match(freeMsg, /Total Tagihan: Rp 0 \(Gratis \/ Free Entry\)/);

        // 5. Zero emojis constraint across all unicode ranges
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
        assert.equal(emojiRegex.test(msg), false, 'Event WhatsApp message must not contain any emojis');
        assert.equal(emojiRegex.test(freeMsg), false, 'Free event WhatsApp message must not contain any emojis');
      });

      it('registerEvent returns whatsappUrl pointing to WA_ADMIN with coherent metadata and zero emojis', async () => {
        const originalTransaction = prisma.$transaction;
        const originalUserFindUnique = prisma.user.findUnique;
        const originalUserCreate = prisma.user.create;

        prisma.$transaction = async (fn) => {
          const fakeTx = {
            $queryRaw: async () => [],
            event: {
              findUnique: async () => ({
                ...mockEvent,
                status: 'OPEN',
                quota: 100,
                sessionOptions: ['Night Drive 20:00'],
                regStartTime: new Date(Date.now() - 3600000),
                regEndTime: new Date(Date.now() + 3600000),
              }),
            },
            eventRegistration: {
              deleteMany: async () => ({ count: 0 }),
              findUnique: async () => null,
              findFirst: async () => null,
              count: async () => 1,
              create: async ({ data }) => ({
                id: 'reg-new-uuid-888',
                userId: data.userId,
                eventId: data.eventId,
                selectedSession: data.selectedSession,
                paymentStatus: 'PENDING',
                createdAt: new Date(),
                user: { id: data.userId, name: 'Wa Test Participant', email: 'watest@kalceria.test', phone: '+628117998790' },
                event: mockEvent,
              }),
            },
          };
          return fn(fakeTx);
        };
        prisma.user.findUnique = async () => null;
        prisma.user.create = async ({ data }) => ({
          id: 'user-guest-new-id',
          name: data.name,
          email: data.email,
          phone: data.phone,
        });

        try {
          const req = {
            params: { eventId: mockEvent.id },
            body: {
              name: 'Wa Test Participant',
              email: 'watest@kalceria.test',
              contact: '+628117998790',
              selectedSession: 'Night Drive 20:00',
            },
            ip: '198.51.100.99',
            get: () => '',
          };
          const res = createMockRes();

          await registerEvent(req, res, () => {});
          const expectedAdmin = process.env.WA_ADMIN_NUMBER || '628117998790';
          assert.equal(res.statusCode, 201);
          assert.ok(res.body.whatsappUrl);
          assert.match(res.body.whatsappUrl, new RegExp(`^https:\\/\\/wa\\.me\\/${expectedAdmin}\\?text=`));

          const decodedText = decodeURIComponent(res.body.whatsappUrl.replace(`https://wa.me/${expectedAdmin}?text=`, ''));
          assert.match(decodedText, /^PENDAFTARAN EVENT - SEE EVENT/);
          assert.match(decodedText, /watest@kalceria\.test/);
          assert.match(decodedText, /Wa Test Participant/);
          assert.match(decodedText, /Total Tagihan: Rp 150\.000/);

          // Zero emojis in decoded URL text
          const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
          assert.equal(emojiRegex.test(decodedText), false, 'Decoded whatsappUrl text must not contain any emojis');
        } finally {
          prisma.$transaction = originalTransaction;
          prisma.user.findUnique = originalUserFindUnique;
          prisma.user.create = originalUserCreate;
        }
      });

      it('checkEventEmailRegistration detects existing registrations and prunes expired ones', async () => {
        const originalFind = prisma.eventRegistration.findFirst;
        const originalDeleteMany = prisma.eventRegistration.deleteMany;

        prisma.eventRegistration.deleteMany = async () => ({ count: 0 });
        prisma.eventRegistration.findFirst = async ({ where }) => {
          if (where.eventId === 'evt-1' && where.user?.email === 'varsikurniawan@gmail.com') {
            return { id: 'reg-varsi-1', paymentStatus: 'CONFIRMED' };
          }
          return null;
        };

        try {
          const reqMatch = { params: { eventId: 'evt-1' }, query: { email: 'VarsiKurniawan@gmail.com' } };
          const resMatch = createMockRes();
          await checkEventEmailRegistration(reqMatch, resMatch, () => {});
          assert.equal(resMatch.statusCode, 200);
          assert.equal(resMatch.body.isRegistered, true);
          assert.equal(resMatch.body.isConfirmed, true);

          const reqNoMatch = { params: { eventId: 'evt-2' }, query: { email: 'varsikurniawan@gmail.com' } };
          const resNoMatch = createMockRes();
          await checkEventEmailRegistration(reqNoMatch, resNoMatch, () => {});
          assert.equal(resNoMatch.statusCode, 200);
          assert.equal(resNoMatch.body.isRegistered, false);
        } finally {
          prisma.eventRegistration.findFirst = originalFind;
          prisma.eventRegistration.deleteMany = originalDeleteMany;
        }
      });

      it('registerEvent rejects duplicate registration for same event with 409 but allows different event', async () => {
        const originalTransaction = prisma.$transaction;
        const originalUserFindUnique = prisma.user.findUnique;

        prisma.user.findUnique = async () => ({
          id: 'user-varsi-123',
          name: 'Varsi Kurniawan',
          email: 'varsikurniawan@gmail.com',
          phone: '+628117998790',
        });

        prisma.$transaction = async (cb) => {
          const mockTx = {
            $queryRaw: async () => [],
            event: {
              findUnique: async () => ({
                id: 'evt-1',
                status: 'OPEN',
                regStartTime: new Date(Date.now() - 3600000),
                regEndTime: new Date(Date.now() + 3600000),
                sessionOptions: ['Midnight Session 23:00'],
                quota: 200,
              }),
            },
            eventRegistration: {
              deleteMany: async () => ({ count: 0 }),
              findFirst: async ({ where }) => {
                if (where.eventId === 'evt-1') {
                  return {
                    id: 'existing-reg-1',
                    paymentStatus: 'CONFIRMED',
                    selectedSession: 'Midnight Session 23:00',
                    user: { name: 'Varsi', email: 'varsikurniawan@gmail.com', phone: '+628117998790' },
                    event: { id: 'evt-1', title: 'Midnight Mechanics' },
                  };
                }
                return null;
              },
              count: async () => 1,
              create: async ({ data }) => ({
                id: 'new-reg-different-event',
                ...data,
                user: { name: 'Varsi', email: 'varsikurniawan@gmail.com', phone: '+628117998790' },
                event: { id: data.eventId, title: 'Different Event' },
              }),
            },
          };
          return cb(mockTx);
        };

        try {
          const reqDup = {
            params: { eventId: 'evt-1' },
            body: {
              name: 'Varsi Kurniawan',
              email: 'varsikurniawan@gmail.com',
              contact: '+628117998790',
              selectedSession: 'Midnight Session 23:00',
              mode: 'account',
            },
            get: () => '',
          };
          const resDup = createMockRes();
          await registerEvent(reqDup, resDup, () => {});
          assert.equal(resDup.statusCode, 409);
          assert.equal(resDup.body.error, 'Email sudah terdaftar untuk event ini.');
        } finally {
          prisma.$transaction = originalTransaction;
          prisma.user.findUnique = originalUserFindUnique;
        }
      });

      it('renders dynamic timer badge SVG with dark theme card and valid SMIL visibility', () => {
        const svgConfirmed = renderTimerBadgeSvg({ status: 'CONFIRMED' });
        assert.ok(svgConfirmed.includes('STATUS: RESMI DIKONFIRMASI &amp; DIKUNCI'));
        assert.ok(svgConfirmed.includes('<svg'));
        assert.ok(svgConfirmed.includes('width="460"'));
        assert.ok(svgConfirmed.includes('#0a0e27'));

        const svgExpired = renderTimerBadgeSvg({ status: 'EXPIRED' });
        assert.ok(svgExpired.includes('STATUS: KADALUARSA'));
        assert.ok(svgExpired.includes('#dc2626'));

        const svgActive = renderTimerBadgeSvg({ status: 'PENDING', elapsedMs: 30000, limitMs: 180000 });
        assert.ok(svgActive.includes('SISA WAKTU:'));
        assert.ok(svgActive.includes('attributeName="visibility"'));
      });

      it('renders dynamic timer badge animated GIF (Pure Node.js) with valid GIF89a header and frames', () => {
        const gifConfirmed = renderTimerBadgeGif({ status: 'CONFIRMED' });
        assert.ok(Buffer.isBuffer(gifConfirmed));
        assert.equal(gifConfirmed.subarray(0, 6).toString('ascii'), 'GIF89a');

        const gifExpired = renderTimerBadgeGif({ status: 'EXPIRED' });
        assert.ok(Buffer.isBuffer(gifExpired));
        assert.equal(gifExpired.subarray(0, 6).toString('ascii'), 'GIF89a');

        const gifActive = renderTimerBadgeGif({ status: 'PENDING', elapsedMs: 175000, limitMs: 180000 });
        assert.ok(Buffer.isBuffer(gifActive));
        assert.equal(gifActive.subarray(0, 6).toString('ascii'), 'GIF89a');
        assert.ok(gifActive.length > 500, 'GIF buffer must contain frames and color table');
      });
    });
  });

  after(async () => {
    try {
      if (redis?.disconnect) redis.disconnect();
    } catch {}
  });
});
