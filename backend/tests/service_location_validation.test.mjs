import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { redis } from '../lib/redis.js';
import {
  isValidIndonesianLocation,
  searchIndonesianLocations,
  reverseGeocodeLocation,
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
    const INDO_PHONE_REGEX = /^\+628[1-9][0-9]{7,11}$/;

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
        assert.equal(INDO_PHONE_REGEX.test(num), true, `${num} should be valid`);
      }
    });

    it('rejects invalid numbers, gibberish (e.g. 645645465), and wrong country codes', () => {
      const invalidNumbers = [
        '645645465',       // User screenshot gibberish
        '+62645645465',    // Doesn't start with 8
        '+62801234567',    // 80x is not a valid Indonesian mobile operator prefix
        '+62812',          // Too short (< 9 digits)
        '+62812345678901234', // Too long (> 13 digits)
        '081234567890',    // Missing +62 country code
        'abcde123456',     // Non-numeric
      ];

      for (const num of invalidNumbers) {
        assert.equal(INDO_PHONE_REGEX.test(num), false, `${num} should be invalid`);
      }
    });
  });

  describe('2. Deployment Area Indonesian Location Validation', () => {
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

  describe('3. Location Autocomplete Search & Reverse Geocode API', () => {
    it('returns verified suggestions for query "Jl" or "Margonda"', async () => {
      const req = { query: { q: 'Margonda' } };
      const res = createMockRes();

      await searchIndonesianLocations(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.results));
      assert.ok(res.body.results.length > 0);
      const match = res.body.results[0];
      assert.match(match.formatted, /Margonda/i);
      assert.match(match.formatted, /Jawa Barat/i);
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

  describe('4. Backend createServiceRequest Endpoint Hardening', () => {
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
