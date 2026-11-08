import crypto from 'node:crypto';

// In-memory bounded cache for Google JWKS public keys
let jwksCache = { keys: null, expiry: 0 };

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
