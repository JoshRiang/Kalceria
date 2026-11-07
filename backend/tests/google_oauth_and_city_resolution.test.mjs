import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  handleGoogleOAuthStart,
  handleGoogleOAuthExchange,
  verifyGoogleIdTokenWithJwks,
  isGoogleOAuthConfigured,
} from '../controllers/googleAuthController.js';
import {
  extractBirthYearFromGoogle,
  resolveCityFromGoogleProfile,
  resolveAndValidateCity,
  searchWorldwideAndIndonesianCities,
  signCityToken,
  verifyCityToken,
  INDONESIAN_CITY_INDEX,
} from '../utils/cityResolver.js';
import { inspectPayloadSafety } from '../middleware/ingressDefense.js';

test('1. Ingress defense allows OAuth codes, states, and city tokens without false positives', () => {
  const safePayload = {
    code: '4/0AVGzR1_test_long_google_authorization_code_with/slashes+and=equals_tokens',
    state: crypto.randomBytes(32).toString('hex'),
    cityToken: crypto.randomBytes(32).toString('hex'),
    redirectUri: 'https://kalceria.id/auth/google/callback',
  };

  const result = inspectPayloadSafety(safePayload);
  assert.equal(result.safe, true, 'OAuth payload should pass payload safety inspection');
});

test('2. Cryptographic City Token Signing & Timing-Safe Verification', () => {
  const cityName = 'Tokyo';
  const lat = 35.6762;
  const lng = 139.6503;

  const token = signCityToken(cityName, lat, lng);
  assert.ok(token && typeof token === 'string' && token.length === 64, 'Token must be 64-char hex');

  const valid = verifyCityToken(cityName, lat, lng, token);
  assert.equal(valid, true, 'City token must be valid for matching city and coords');

  const invalidCity = verifyCityToken('Kyoto', lat, lng, token);
  assert.equal(invalidCity, false, 'Tampered city name must fail verification');

  const invalidCoords = verifyCityToken(cityName, 35.0, lng, token);
  assert.equal(invalidCoords, false, 'Tampered coordinates must fail verification');
});

test('3. Indonesia Priority Index & Comprehensive Regencies', () => {
  const bintaro = INDONESIAN_CITY_INDEX.find((c) => c.name === 'Bintaro');
  assert.ok(bintaro, 'Bintaro must be indexed');
  assert.equal(bintaro.province, 'Banten');

  const tangsel = INDONESIAN_CITY_INDEX.find((c) => c.name === 'Tangerang Selatan');
  assert.ok(tangsel, 'Tangerang Selatan must be indexed');
  assert.ok(tangsel.aliases.includes('pondok aren'), 'Must contain Pondok Aren kecamatan alias');
});

test('4. Birth Year Extraction from Google People API & Claims', () => {
  // Scenario A: Full Google People API structured birthday
  const peopleDataA = {
    birthdays: [
      {
        metadata: { primary: true },
        date: { year: 2002, month: 11, day: 25 },
      },
    ],
  };
  const yearA = extractBirthYearFromGoogle(peopleDataA);
  assert.equal(yearA, '2002', 'Must extract 4-digit YYYY from structured birthday');

  // Scenario B: ISO birthdate string in claims
  const claimsB = {
    birthdate: '1999-04-12',
  };
  const yearB = extractBirthYearFromGoogle(claimsB);
  assert.equal(yearB, '1999', 'Must extract 4-digit YYYY from birthdate claim');
});

test('5. City Resolution from Google Profile: Indonesia Priority First', async () => {
  const peopleData = {
    addresses: [
      {
        metadata: { primary: true },
        formattedValue: 'Jl. Maleo Blok JB No. 1, Pondok Aren, Tangerang Selatan, Banten 15224, Indonesia',
        city: 'Tangerang Selatan',
        country: 'Indonesia',
      },
    ],
  };

  const resolved = await resolveCityFromGoogleProfile(peopleData);
  assert.ok(resolved, 'Must resolve city');
  assert.equal(resolved.name, 'Tangerang Selatan');
  assert.equal(resolved.isIndonesia, true);
  assert.ok(resolved.lat !== 0 && resolved.lng !== 0, 'Must have valid coordinates');
});

test('6. Dynamic Worldwide City Resolution via Mock Geocoder & Token Validation', async () => {
  const mockFetch = async (url) => {
    if (String(url).includes('photon.komoot.io') || String(url).includes('nominatim')) {
      return {
        ok: true,
        json: async () => ({
          features: [
            {
              properties: {
                name: 'Tokyo',
                city: 'Tokyo',
                country: 'Japan',
                countrycode: 'JP',
              },
              geometry: {
                coordinates: [139.6917, 35.6895], // [lng, lat]
              },
            },
          ],
        }),
      };
    }
    throw new Error(`Unexpected URL in mock: ${url}`);
  };

  const results = await searchWorldwideAndIndonesianCities('Tokyo', {
    fetchImpl: mockFetch,
    limit: 5,
  });

  assert.ok(results.length > 0, 'Must return results for Tokyo');
  const tokyo = results[0];
  assert.equal(tokyo.name, 'Tokyo');
  assert.equal(tokyo.countryCode, 'JP');
  assert.ok(tokyo.cityToken, 'Must generate signed cityToken for client validation');

  // Validate the city resolution in registration pipeline
  const validation = await resolveAndValidateCity(tokyo.label, {
    domicileLat: tokyo.lat,
    domicileLng: tokyo.lng,
    cityToken: tokyo.cityToken,
    fetchImpl: mockFetch,
  });

  assert.equal(validation.valid, true, 'Worldwide city with signed token must be accepted');
  assert.equal(validation.coords[0], tokyo.lat);
  assert.equal(validation.coords[1], tokyo.lng);
});

test('7. Real RSA-2048 Cryptographic Verification of Google id_token', async () => {
  // Generate a real ephemeral RSA-2048 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const kid = 'test-google-key-id-001';
  const jwk = publicKey.export({ format: 'jwk' });
  jwk.kid = kid;
  jwk.alg = 'RS256';
  jwk.use = 'sig';

  const testClientId = 'kalceria-test-client-id.apps.googleusercontent.com';
  const testNonce = crypto.randomBytes(16).toString('hex');

  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', kid, typ: 'JWT' };
  const payload = {
    iss: 'https://accounts.google.com',
    aud: testClientId,
    sub: 'google-user-123456789',
    email: 'reinathan.test@kalceria.id',
    email_verified: true,
    name: 'Reinathan Ezkhiel',
    nonce: testNonce,
    iat: nowSec - 10,
    exp: nowSec + 3600,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${headerB64}.${payloadB64}`);
  const sigB64 = signer.sign(privateKey, 'base64url');

  const validToken = `${headerB64}.${payloadB64}.${sigB64}`;

  // Valid token check
  const verifiedClaims = await verifyGoogleIdTokenWithJwks(validToken, {
    clientId: testClientId,
    expectedNonce: testNonce,
    jwks: [jwk],
  });

  assert.equal(verifiedClaims.email, 'reinathan.test@kalceria.id');
  assert.equal(verifiedClaims.name, 'Reinathan Ezkhiel');

  // Tampered payload check
  const tamperedPayloadB64 = Buffer.from(
    JSON.stringify({ ...payload, email: 'hacker@evil.com' })
  ).toString('base64url');
  const tamperedToken = `${headerB64}.${tamperedPayloadB64}.${sigB64}`;

  await assert.rejects(
    () =>
      verifyGoogleIdTokenWithJwks(tamperedToken, {
        clientId: testClientId,
        expectedNonce: testNonce,
        jwks: [jwk],
      }),
    /signature verification failed/i
  );

  // Nonce mismatch check
  await assert.rejects(
    () =>
      verifyGoogleIdTokenWithJwks(validToken, {
        clientId: testClientId,
        expectedNonce: 'wrong-nonce',
        jwks: [jwk],
      }),
    /nonce mismatch/i
  );
});

test('8. Google OAuth Start Security: Open Redirect Rejection & State Generation', async () => {
  process.env.GOOGLE_CLIENT_ID = 'mock-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'mock-google-client-secret';

  // Open redirect attempt
  await assert.rejects(
    () =>
      handleGoogleOAuthStart({
        redirectUri: 'https://attacker.evil.com/auth/google/callback',
      }),
    /Redirect URI origin is not authorized/i
  );

  // Legitimate redirect URI
  const result = await handleGoogleOAuthStart({
    redirectUri: 'https://kalceria.id/auth/google/callback',
  });

  assert.ok(result.authUrl, 'Must return authUrl');
  assert.ok(result.state && result.state.length === 64, 'State must be 64-char hex string');
  assert.ok(result.authUrl.includes('code_challenge='), 'Must include PKCE code_challenge');
  assert.ok(result.authUrl.includes('code_challenge_method=S256'), 'Must use S256 PKCE');
});

test('9. Google OAuth Exchange: Anti-Replay Atomic State Consumption & Session Handoff', async () => {
  // Setup ephemeral RSA keys for ID token verification
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = 'kid-exchange-test-01';
  const jwk = publicKey.export({ format: 'jwk' });
  jwk.kid = kid;
  jwk.alg = 'RS256';

  const testClientId = 'mock-google-client-id';
  const testClientSecret = 'mock-google-client-secret';
  process.env.GOOGLE_CLIENT_ID = testClientId;
  process.env.GOOGLE_CLIENT_SECRET = testClientSecret;

  const startRes = await handleGoogleOAuthStart({
    redirectUri: 'https://kalceria.id/auth/google/callback',
  });
  const state = startRes.state;

  // Extract nonce and code_challenge from authUrl for crafting mock token
  const authUrlObj = new URL(startRes.authUrl);
  const nonce = authUrlObj.searchParams.get('nonce');

  const nowSec = Math.floor(Date.now() / 1000);
  const idTokenPayload = {
    iss: 'https://accounts.google.com',
    aud: testClientId,
    sub: 'google-sub-987654',
    email: 'newbie.kalcerian@gmail.com',
    email_verified: true,
    name: 'Newbie Kalcerian',
    nonce,
    iat: nowSec - 10,
    exp: nowSec + 3600,
  };

  const headerB64 = Buffer.from(JSON.stringify({ alg: 'RS256', kid })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(idTokenPayload)).toString('base64url');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${headerB64}.${payloadB64}`);
  const idToken = `${headerB64}.${payloadB64}.${signer.sign(privateKey, 'base64url')}`;

  const mockFetch = async (url) => {
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return {
        ok: true,
        json: async () => ({
          access_token: 'mock-access-token',
          id_token: idToken,
        }),
      };
    }
    if (String(url).includes('people.googleapis.com')) {
      return {
        ok: true,
        json: async () => ({
          birthdays: [{ date: { year: 2003, month: 5, day: 10 } }],
          addresses: [
            {
              formattedValue: 'Cilandak, Jakarta Selatan, Indonesia',
              city: 'Jakarta Selatan',
            },
          ],
        }),
      };
    }
    throw new Error(`Unexpected mock URL: ${url}`);
  };

  const mockPrisma = {
    user: {
      findUnique: async () => null, // User does not exist yet -> NEW_USER
    },
  };

  // First exchange: should succeed as NEW_USER
  const exchangeResult = await handleGoogleOAuthExchange({
    code: 'mock-auth-code',
    state,
    redirectUri: 'https://kalceria.id/auth/google/callback',
    stateCookie: state,
    fetchImpl: mockFetch,
    prismaClient: mockPrisma,
    jwks: [jwk],
  });

  assert.equal(exchangeResult.status, 'NEW_USER');
  assert.equal(exchangeResult.googleProfile.email, 'newbie.kalcerian@gmail.com');
  assert.equal(exchangeResult.googleProfile.birthYear, '2003');
  assert.equal(exchangeResult.googleProfile.city, 'Jakarta Selatan');

  // Second exchange with same state: anti-replay must fail immediately!
  await assert.rejects(
    () =>
      handleGoogleOAuthExchange({
        code: 'mock-auth-code',
        state,
        redirectUri: 'https://kalceria.id/auth/google/callback',
        stateCookie: state,
        fetchImpl: mockFetch,
        prismaClient: mockPrisma,
        jwks: [jwk],
      }),
    /OAuth state is expired or has already been used/i
  );

  setTimeout(() => process.exit(0), 100);
});
