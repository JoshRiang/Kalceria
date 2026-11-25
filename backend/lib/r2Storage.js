import crypto from 'node:crypto';

/**
 * Modular Zero-Dependency Cloudflare R2 Storage Client (Express Backend)
 *
 * Supports:
 * 1. Cloudflare R2 Gateway Worker (primary): R2_GATEWAY_URL + R2_GATEWAY_TOKEN
 * 2. Direct R2 S3-compatible SigV4 API (optional): R2_ACCOUNT_ID + R2_BUCKET_NAME + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
 */

const DEFAULT_PUBLIC_BASE_URL = 'https://cdn.kalceria.id';
const DEFAULT_UPLOAD_TIMEOUT_MS = 28_000;

function getGatewayConfig() {
  const gatewayUrl = String(process.env.R2_GATEWAY_URL || '').trim().replace(/\/+$/, '');
  const gatewayToken = String(process.env.R2_GATEWAY_TOKEN || '').trim();
  const publicBaseUrl = String(
    process.env.R2_PUBLIC_BASE_URL || gatewayUrl || DEFAULT_PUBLIC_BASE_URL
  )
    .trim()
    .replace(/\/+$/, '');
  return {
    configured: Boolean(gatewayUrl && gatewayToken),
    gatewayUrl,
    gatewayToken,
    publicBaseUrl,
  };
}

function getS3Config() {
  const accountId = String(process.env.R2_ACCOUNT_ID || '').trim();
  const bucketName = String(process.env.R2_BUCKET_NAME || 'kalceria-media').trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
  return {
    configured: Boolean(accountId && bucketName && accessKeyId && secretAccessKey),
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
  };
}

export function isR2Configured() {
  return getGatewayConfig().configured || getS3Config().configured;
}

function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function buildSigV4Headers({
  method,
  host,
  canonicalUri,
  canonicalQuery = '',
  payloadHash,
  contentType,
  accessKeyId,
  secretAccessKey,
}) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';

  const headersToSign = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) {
    headersToSign['content-type'] = contentType;
  }

  const sortedKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headersToSign[k]}\n`).join('');
  const signedHeaders = sortedKeys.join(';');
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const out = {
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) {
    out['Content-Type'] = contentType;
  }
  return out;
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function putR2Object({
  key,
  body,
  contentType = 'application/octet-stream',
  timeoutMs = DEFAULT_UPLOAD_TIMEOUT_MS,
}) {
  const cleanKey = String(key || '').replace(/^\/+/, '');
  const gw = getGatewayConfig();

  if (gw.configured) {
    const res = await fetchWithTimeout(
      `${gw.gatewayUrl}/${cleanKey}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${gw.gatewayToken}`,
          'Content-Type': contentType,
        },
        body: Buffer.from(body),
      },
      timeoutMs
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Cloudflare R2 Gateway PUT failed (${res.status}): ${errText.slice(0, 180)}`);
    }
    const data = await res.json().catch(() => ({}));
    return {
      url: `${gw.publicBaseUrl}/${cleanKey}`,
      key: cleanKey,
      size: typeof data.size === 'number' ? data.size : body.byteLength,
      etag: data.etag || null,
      provider: 'cloudflare-r2',
    };
  }

  const s3 = getS3Config();
  if (!s3.configured) {
    throw new Error('Cloudflare R2 storage is not configured.');
  }

  const host = `${s3.accountId}.r2.cloudflarestorage.com`;
  const encodedPath = cleanKey.split('/').map(encodeURIComponent).join('/');
  const canonicalUri = `/${encodeURIComponent(s3.bucketName)}/${encodedPath}`;
  const payloadHash = sha256Hex(body);
  const headers = buildSigV4Headers({
    method: 'PUT',
    host,
    canonicalUri,
    payloadHash,
    contentType,
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
  });

  const res = await fetchWithTimeout(
    `https://${host}${canonicalUri}`,
    {
      method: 'PUT',
      headers,
      body: Buffer.from(body),
    },
    timeoutMs
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Cloudflare R2 S3 PUT failed (${res.status}): ${errText.slice(0, 180)}`);
  }

  return {
    url: `${s3.publicBaseUrl}/${cleanKey}`,
    key: cleanKey,
    size: body.byteLength,
    etag: res.headers.get('etag'),
    provider: 'cloudflare-r2',
  };
}

export async function deleteR2Object(key) {
  const cleanKey = String(key || '').replace(/^\/+/, '');
  if (!cleanKey) return false;
  const gw = getGatewayConfig();
  if (!gw.configured) return false;

  const res = await fetchWithTimeout(
    `${gw.gatewayUrl}/${cleanKey}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${gw.gatewayToken}` },
    },
    15_000
  );
  return res.ok;
}
