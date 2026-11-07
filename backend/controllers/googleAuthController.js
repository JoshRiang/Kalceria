import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { isAllowedOrigin } from '../utils/allowedOrigins.js';
import {
  createAuthSession,
  setAuthCookie,
} from '../utils/authSession.js';
import { issueLoginCsrfToken } from './authController.js';
import {
  extractBirthYearFromGoogle,
  resolveCityFromGoogleProfile,
} from '../utils/cityResolver.js';

// In-memory bounded cache for Google JWKS public keys
let jwksCache = { keys: null, expiry: 0 };
const STATE_TTL_SECONDS = 300; // 5 minutes

// In-memory fallback for states if Redis is unreachable
const stateMemStore = new Map();
const MAX_STATE_MEM = 5000;

function pruneStateMemStore() {
  if (stateMemStore.size < MAX_STATE_MEM) return;
  const now = Date.now();
  for (const [k, v] of stateMemStore.entries()) {
    if (now > v.exp) stateMemStore.delete(k);
  }
  if (stateMemStore.size >= MAX_STATE_MEM) {
    const oldest = stateMemStore.keys().next().value;
    if (oldest !== undefined) stateMemStore.delete(oldest);
  }
}

export function isGoogleOAuthConfigured() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(clientId && clientId.trim() && clientSecret && clientSecret.trim());
}

export function getGoogleClientId() {
  return (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
}

export function getGoogleClientSecret() {
  return (process.env.GOOGLE_CLIENT_SECRET || '').trim();
}

/**
 * Fetch and cache Google JWKS certs
 */
export async function getGoogleJwks({ fetchImpl = fetch } = {}) {
  const now = Date.now();
  if (jwksCache.keys && now < jwksCache.expiry) {
    return jwksCache.keys;
  }
  try {
    const res = await fetchImpl('https://www.googleapis.com/oauth2/v3/certs', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Google certs HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.keys)) throw new Error('Invalid JWKS structure');

    // Parse max-age from cache-control header
    const cc = res.headers?.get ? res.headers.get('cache-control') : null;
    let maxAgeSec = 3600;
    if (typeof cc === 'string') {
      const match = /max-age=(\d+)/i.exec(cc);
      if (match?.[1]) maxAgeSec = Math.max(300, parseInt(match[1], 10));
    }

    jwksCache = {
      keys: data.keys,
      expiry: now + maxAgeSec * 1000,
    };
    return jwksCache.keys;
  } catch (err) {
    if (jwksCache.keys) return jwksCache.keys;
    throw err;
  }
}

/**
 * Validates Google id_token cryptographically using Node's crypto JWK verification
 */
export async function verifyGoogleIdTokenWithJwks(
  idToken,
  { clientId, expectedNonce, jwks, fetchImpl = fetch } = {}
) {
  if (typeof idToken !== 'string' || !idToken.includes('.')) {
    throw new Error('Malformed id_token');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT segments');

  const [headerB64, payloadB64, sigB64] = parts;
  let header, payload;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Unparseable JWT header or payload');
  }

  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported JWT alg: ${header.alg}`);
  }

  const keys = jwks || (await getGoogleJwks({ fetchImpl }));
  const matchingJwk = keys.find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (!matchingJwk) {
    throw new Error(`Public key not found for kid: ${header.kid}`);
  }

  // Cryptographic signature check
  const publicKey = crypto.createPublicKey({ key: matchingJwk, format: 'jwk' });
  const signedContent = `${headerB64}.${payloadB64}`;
  const sigBuffer = Buffer.from(sigB64, 'base64url');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signedContent);
  const isValid = verifier.verify(publicKey, sigBuffer);

  if (!isValid) {
    throw new Error('Cryptographic signature verification failed');
  }

  // Claim validations
  const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    throw new Error(`Invalid id_token issuer: ${payload.iss}`);
  }

  const expectedAud = clientId || getGoogleClientId();
  if (expectedAud && payload.aud !== expectedAud) {
    throw new Error(`Invalid id_token audience: ${payload.aud}`);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < nowSec - 60) {
    throw new Error('id_token has expired');
  }

  if (expectedNonce) {
    const a = Buffer.from(String(expectedNonce));
    const b = Buffer.from(String(payload.nonce || ''));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new Error('Nonce mismatch in id_token');
    }
  }

  const emailVerified =
    payload.email_verified === true ||
    payload.email_verified === 'true' ||
    payload.email_verified === 1;
  if (!emailVerified) {
    throw new Error('Google email is not verified');
  }

  return payload;
}

/**
 * Core pure helper for startGoogleOAuth
 */
export async function handleGoogleOAuthStart({
  redirectUri,
  flowMode = 'popup',
  reqClientFp = '',
  redisClient = redis,
}) {
  if (!isGoogleOAuthConfigured()) {
    const err = new Error(
      'Google Sign-In is not configured yet. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.'
    );
    err.code = 'GOOGLE_OAUTH_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  if (!redirectUri || typeof redirectUri !== 'string') {
    const err = new Error('Redirect URI is required.');
    err.status = 400;
    throw err;
  }

  let parsedRedirect;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch {
    const err = new Error('Invalid redirect URI.');
    err.status = 400;
    throw err;
  }

  if (!isAllowedOrigin(parsedRedirect.origin)) {
    const err = new Error('Redirect URI origin is not authorized.');
    err.status = 400;
    throw err;
  }

  if (!parsedRedirect.pathname.endsWith('/auth/google/callback')) {
    const err = new Error('Redirect URI pathname must end with /auth/google/callback.');
    err.status = 400;
    throw err;
  }

  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const statePayload = {
    nonce,
    codeVerifier,
    redirectUri,
    flowMode,
    fpHash: crypto.createHash('sha256').update(String(reqClientFp || '')).digest('hex'),
    createdAt: Date.now(),
  };

  const redisKey = `oauth:google:state:${state}`;
  let stored = false;
  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.set(redisKey, JSON.stringify(statePayload), 'EX', STATE_TTL_SECONDS);
      stored = true;
    } catch {}
  }
  if (!stored) {
    pruneStateMemStore();
    stateMemStore.set(state, {
      payload: statePayload,
      exp: Date.now() + STATE_TTL_SECONDS * 1000,
    });
  }

  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope:
      'openid email profile https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.addresses.read',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    access_type: 'online',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return { authUrl, state };
}

/**
 * Core pure helper for exchangeGoogleOAuth
 */
export async function handleGoogleOAuthExchange({
  code,
  state,
  redirectUri,
  stateCookie,
  redisClient = redis,
  prismaClient = prisma,
  fetchImpl = fetch,
  jwks,
}) {
  if (!code || typeof code !== 'string') {
    const err = new Error('Authorization code is required.');
    err.status = 400;
    throw err;
  }
  if (!state || typeof state !== 'string' || !/^[a-f0-9]{64}$/i.test(state)) {
    const err = new Error('Invalid OAuth state parameter.');
    err.status = 400;
    throw err;
  }

  // 1. Anti-CSRF Cookie vs Query state match
  if (stateCookie) {
    const a = Buffer.from(state);
    const b = Buffer.from(stateCookie);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      const err = new Error('OAuth state does not match cookie binding.');
      err.status = 403;
      throw err;
    }
  }

  // 2. Atomic state consumption from Redis / Memory
  const redisKey = `oauth:google:state:${state}`;
  let stateJson = null;
  if (redisClient && redisClient.status === 'ready') {
    try {
      stateJson = await redisClient.eval(
        "local v = redis.call('GET', KEYS[1]); if v then redis.call('DEL', KEYS[1]); end; return v;",
        1,
        redisKey
      );
    } catch {}
  }
  if (!stateJson) {
    const mem = stateMemStore.get(state);
    if (mem) {
      stateMemStore.delete(state);
      if (Date.now() <= mem.exp) {
        stateJson = JSON.stringify(mem.payload);
      }
    }
  }

  if (!stateJson) {
    const err = new Error('OAuth state is expired or has already been used.');
    err.status = 400;
    throw err;
  }

  let stateData;
  try {
    stateData = JSON.parse(stateJson);
  } catch {
    const err = new Error('Corrupted OAuth state.');
    err.status = 400;
    throw err;
  }

  // Check redirectUri match
  if (redirectUri && stateData.redirectUri !== redirectUri) {
    const err = new Error('Redirect URI mismatch.');
    err.status = 400;
    throw err;
  }

  // 3. Exchange authorization code with Google Token Endpoint
  const tokenParams = new URLSearchParams({
    code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: stateData.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: stateData.codeVerifier,
  });

  const tokenRes = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const errData = await tokenRes.json().catch(() => ({}));
    const err = new Error(
      `Google token exchange failed: ${errData.error_description || errData.error || tokenRes.statusText}`
    );
    err.status = 400;
    throw err;
  }

  const tokenData = await tokenRes.json();
  const { id_token, access_token } = tokenData;

  // 4. Verify ID Token cryptographically
  const claims = await verifyGoogleIdTokenWithJwks(id_token, {
    clientId: getGoogleClientId(),
    expectedNonce: stateData.nonce,
    jwks,
    fetchImpl,
  });

  const normalizedEmail = (claims.email || '').trim().toLowerCase();
  const displayName = (claims.name || claims.given_name || normalizedEmail.split('@')[0] || 'User').trim();

  // 5. Fetch People API with short timeout for DOB & Address
  let peopleData = null;
  if (access_token) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const peopleRes = await fetchImpl(
        'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,birthdays,addresses,locales',
        {
          headers: { Authorization: `Bearer ${access_token}` },
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timer));

      if (peopleRes.ok) {
        peopleData = await peopleRes.json();
      }
    } catch {}
  }

  // 6. Extract Birth Year (YYYY) and Resolve City
  const birthYear = extractBirthYearFromGoogle(peopleData || claims);
  const resolvedCity = await resolveCityFromGoogleProfile(peopleData || claims, { fetchImpl });

  // 7. Check if user exists in database
  const existingUser = await prismaClient.user.findUnique({
    where: { email: normalizedEmail },
  });

  const emailAuthOn = process.env.ENABLE_EMAIL_AUTH === 'true';

  if (existingUser && (existingUser.isEmailVerified || !emailAuthOn)) {
    // Existing verified account: issue session & welcome back
    const token = await createAuthSession(existingUser);

    // Auto-mark user active in Redis
    try {
      if (redisClient && redisClient.status === 'ready') {
        const lat = existingUser.domicileLat || -6.2735;
        const lng = existingUser.domicileLng || 106.7110;
        await redisClient.geoadd('active_users', lng, lat, existingUser.id);
        await redisClient.set(
          `live:user:${existingUser.id}`,
          JSON.stringify({ lat, lng, updatedAt: Date.now() }),
          'EX',
          600
        );
        await prismaClient.user.update({
          where: { id: existingUser.id },
          data: { allowLiveLocation: true },
        }).catch(() => {});
        await redisClient.del('cache:all_kalcerians');
        await redisClient.del('cache:map_users:global');
      }
    } catch {}

    return {
      status: 'EXISTING_USER',
      token,
      userId: existingUser.id,
      username: existingUser.nickname || (existingUser.email ? existingUser.email.split('@')[0] : 'User'),
      role: existingUser.role,
      profilePicture: existingUser.profilePicture || null,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        nickname: existingUser.nickname,
        email: existingUser.email,
        role: existingUser.role,
        profilePicture: existingUser.profilePicture || null,
      },
    };
  }

  // If unverified torn record existed from failed prior email attempt, prune it
  if (existingUser && !existingUser.isEmailVerified) {
    await prismaClient.user.delete({ where: { id: existingUser.id } }).catch(() => {});
  }

  // New account (NOT yet registered)
  return {
    status: 'NEW_USER',
    googleProfile: {
      name: displayName,
      email: normalizedEmail,
      birthYear: birthYear || '',
      city: resolvedCity?.name || '',
      cityLabel: resolvedCity?.label || resolvedCity?.name || '',
      isIndonesia: resolvedCity ? Boolean(resolvedCity.isIndonesia) : true,
      domicileLat: resolvedCity?.lat ?? null,
      domicileLng: resolvedCity?.lng ?? null,
      cityToken: resolvedCity?.cityToken || null,
    },
  };
}

// ── Express Handlers ─────────────────────────────────────────────────────────

export async function startGoogleOAuth(req, res, next) {
  try {
    const rawRedirect =
      typeof req.query?.redirectUri === 'string'
        ? req.query.redirectUri
        : typeof req.query?.redirect_uri === 'string'
          ? req.query.redirect_uri
          : null;

    const flowMode = req.query?.mode === 'redirect' ? 'redirect' : 'popup';
    const reqClientFp = req.headers?.['x-forwarded-for'] || req.ip || '';

    const { authUrl, state } = await handleGoogleOAuthStart({
      redirectUri: rawRedirect,
      flowMode,
      reqClientFp,
    });

    // Set HttpOnly anti-CSRF state cookie
    res.cookie('kalceria_g_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
      sameSite: 'lax',
      maxAge: STATE_TTL_SECONDS * 1000,
      path: '/',
    });

    res.json({ authUrl, state });
  } catch (err) {
    if (err.code === 'GOOGLE_OAUTH_NOT_CONFIGURED') {
      return res.status(503).json({
        error: err.message,
        code: err.code,
      });
    }
    next(err);
  }
}

export async function exchangeGoogleOAuth(req, res, next) {
  try {
    const { code, state, redirectUri } = req.body || {};
    const stateCookie = req.cookies?.kalceria_g_state;

    const result = await handleGoogleOAuthExchange({
      code,
      state,
      redirectUri,
      stateCookie,
    });

    // Clear state cookie
    res.clearCookie('kalceria_g_state', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
      sameSite: 'lax',
      path: '/',
    });

    if (result.status === 'EXISTING_USER') {
      setAuthCookie(res, result.token);
      const csrfToken = issueLoginCsrfToken(res);
      return res.json({
        status: 'EXISTING_USER',
        userId: result.userId,
        username: result.username,
        role: result.role,
        profilePicture: result.profilePicture,
        user: result.user,
        csrfToken,
      });
    }

    // NEW_USER status
    return res.json({
      status: 'NEW_USER',
      googleProfile: result.googleProfile,
    });
  } catch (err) {
    res.clearCookie('kalceria_g_state', { path: '/' });
    next(err);
  }
}
