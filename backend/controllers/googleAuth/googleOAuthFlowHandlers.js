import crypto from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { isAllowedOrigin } from '../../utils/allowedOrigins.js';
import { createAuthSession } from '../../utils/authSession.js';
import {
  extractBirthYearFromGoogle,
  resolveCityFromGoogleProfile,
} from '../../utils/cityResolver.js';
import {
  isGoogleOAuthConfigured,
  getGoogleClientId,
  getGoogleClientSecret,
  verifyGoogleIdTokenWithJwks,
} from './googleConfigAndJwks.js';
import {
  saveOAuthState,
  consumeOAuthState,
} from './googleOAuthStateStore.js';

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

  await saveOAuthState(state, statePayload, redisClient);

  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope:
      process.env.GOOGLE_OAUTH_SCOPES || 'openid email profile',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    access_type: 'online',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return { authUrl, state, statePayload };
}

/**
 * Core pure helper for exchangeGoogleOAuth
 */
export async function handleGoogleOAuthExchange({
  code,
  state,
  redirectUri,
  stateCookie,
  signedCookie,
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

  // 2. Atomic state consumption from Redis / Memory / Signed Cookie
  const stateJson = await consumeOAuthState(state, redisClient, signedCookie);

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
