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
import { createServiceRequest } from '../controllers/serviceController.js';

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
  });

  after(async () => {
    try {
      if (redis?.disconnect) redis.disconnect();
    } catch {}
  });
});
