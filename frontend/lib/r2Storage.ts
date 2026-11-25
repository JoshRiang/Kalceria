import crypto from "node:crypto";

/**
 * Modular Zero-Dependency Cloudflare R2 Storage Client (Frontend Next.js API Routes)
 *
 * Supports:
 * 1. Cloudflare R2 Gateway Worker (primary): R2_GATEWAY_URL + R2_GATEWAY_TOKEN
 * 2. Direct R2 S3-compatible SigV4 API (optional): R2_ACCOUNT_ID + R2_BUCKET_NAME + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
 */

const DEFAULT_PUBLIC_BASE_URL = "https://cdn.kalceria.id";
const DEFAULT_UPLOAD_TIMEOUT_MS = 28_000;

export const ALLOWED_R2_PURPOSES = new Set([
  "event-clip",
  "avatar",
  "cover",
  "comment",
  "chat",
  "admin-event",
  "merch",
  "media",
  "event",
  "upload",
]);

export interface R2PutResult {
  url: string;
  key: string;
  size: number;
  etag: string | null;
  provider: "cloudflare-r2";
}

export interface R2ListItem {
  key: string;
  size: number;
  etag: string | null;
  uploaded: string | null;
}

export interface R2ListResult {
  objects: R2ListItem[];
  truncated: boolean;
  cursor: string | null;
}

function getGatewayConfig() {
  const gatewayUrl = String(process.env.R2_GATEWAY_URL || "").trim().replace(/\/+$/, "");
  const gatewayToken = String(process.env.R2_GATEWAY_TOKEN || "").trim();
  const publicBaseUrl = String(
    process.env.R2_PUBLIC_BASE_URL || gatewayUrl || DEFAULT_PUBLIC_BASE_URL
  )
    .trim()
    .replace(/\/+$/, "");
  return {
    configured: Boolean(gatewayUrl && gatewayToken),
    gatewayUrl,
    gatewayToken,
    publicBaseUrl,
  };
}

function getS3Config() {
  const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
  const bucketName = String(process.env.R2_BUCKET_NAME || "kalceria-media").trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
  return {
    configured: Boolean(accountId && bucketName && accessKeyId && secretAccessKey),
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
  };
}

export function isR2Configured(): boolean {
  return getGatewayConfig().configured || getS3Config().configured;
}

export function getTrustedR2Hosts(): string[] {
  const hosts = new Set<string>(["cdn.kalceria.id", "media.kalceria.id"]);
  for (const raw of [process.env.R2_PUBLIC_BASE_URL, process.env.R2_GATEWAY_URL]) {
    if (!raw) continue;
    try {
      hosts.add(new URL(raw).hostname.toLowerCase());
    } catch {}
  }
  return Array.from(hosts);
}

export function isTrustedR2Host(hostname: string): boolean {
  const lower = String(hostname || "").trim().toLowerCase();
  if (!lower) return false;
  if (lower.endsWith(".r2.dev")) return true;
  return getTrustedR2Hosts().includes(lower);
}

export function buildR2ObjectKey(purpose: string, storedFilename: string, eventClipPrefix = "event-clips/"): string {
  const cleanPurpose = String(purpose || "").trim().toLowerCase();
  const safeName = String(storedFilename || `upload-${Date.now()}.bin`)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120) || `upload-${Date.now()}.bin`;

  if (cleanPurpose === "event-clip") {
    const day = new Date().toISOString().slice(0, 10);
    const shortId = crypto.randomUUID().slice(0, 8);
    return `${eventClipPrefix}${day}/${Date.now()}-${shortId}-${safeName}`;
  }

  const shortId = crypto.randomUUID().slice(0, 8);
  const stamp = `${Date.now()}-${shortId}`;

  switch (cleanPurpose) {
    case "avatar":
      return `avatars/${stamp}-${safeName}`;
    case "cover":
      return `covers/${stamp}-${safeName}`;
    case "comment":
      return `comments/${stamp}-${safeName}`;
    case "chat":
      return `chat/${stamp}-${safeName}`;
    case "admin-event":
      return `admin-events/${stamp}-${safeName}`;
    case "merch":
      return `merch/${stamp}-${safeName}`;
    case "media":
      return `media/${stamp}-${safeName}`;
    default:
      return `events/${stamp}-${safeName}`;
  }
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: Buffer | Uint8Array | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function buildSigV4Headers({
  method,
  host,
  canonicalUri,
  canonicalQuery = "",
  payloadHash,
  contentType,
  accessKeyId,
  secretAccessKey,
}: {
  method: string;
  host: string;
  canonicalUri: string;
  canonicalQuery?: string;
  payloadHash: string;
  contentType?: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";

  const headersToSign: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) {
    headersToSign["content-type"] = contentType;
  }

  const sortedKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headersToSign[k]}\n`).join("");
  const signedHeaders = sortedKeys.join(";");
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const out: Record<string, string> = {
    Authorization: authHeader,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) {
    out["Content-Type"] = contentType;
  }
  return out;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
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
  contentType,
  timeoutMs = DEFAULT_UPLOAD_TIMEOUT_MS,
}: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  timeoutMs?: number;
}): Promise<R2PutResult> {
  const cleanKey = key.replace(/^\/+/, "");
  const gw = getGatewayConfig();

  if (gw.configured) {
    const res = await fetchWithTimeout(
      `${gw.gatewayUrl}/${cleanKey}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${gw.gatewayToken}`,
          "Content-Type": contentType || "application/octet-stream",
        },
        body: Buffer.from(body),
      },
      timeoutMs
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Cloudflare R2 Gateway PUT failed (${res.status}): ${errText.slice(0, 180)}`);
    }

    const data = (await res.json().catch(() => ({}))) as { etag?: string; size?: number; url?: string };
    return {
      url: `${gw.publicBaseUrl}/${cleanKey}`,
      key: cleanKey,
      size: typeof data.size === "number" ? data.size : body.byteLength,
      etag: data.etag || null,
      provider: "cloudflare-r2",
    };
  }

  const s3 = getS3Config();
  if (!s3.configured) {
    throw new Error("Cloudflare R2 storage is not configured.");
  }

  const host = `${s3.accountId}.r2.cloudflarestorage.com`;
  const encodedPath = cleanKey.split("/").map(encodeURIComponent).join("/");
  const canonicalUri = `/${encodeURIComponent(s3.bucketName)}/${encodedPath}`;
  const payloadHash = sha256Hex(body);
  const headers = buildSigV4Headers({
    method: "PUT",
    host,
    canonicalUri,
    payloadHash,
    contentType: contentType || "application/octet-stream",
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
  });

  const res = await fetchWithTimeout(
    `https://${host}${canonicalUri}`,
    {
      method: "PUT",
      headers,
      body: Buffer.from(body),
    },
    timeoutMs
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Cloudflare R2 S3 PUT failed (${res.status}): ${errText.slice(0, 180)}`);
  }

  return {
    url: `${s3.publicBaseUrl}/${cleanKey}`,
    key: cleanKey,
    size: body.byteLength,
    etag: res.headers.get("etag"),
    provider: "cloudflare-r2",
  };
}

export async function listR2Objects({
  prefix = "",
  cursor,
  limit = 500,
}: {
  prefix?: string;
  cursor?: string;
  limit?: number;
}): Promise<R2ListResult> {
  const gw = getGatewayConfig();
  if (!gw.configured) {
    return { objects: [], truncated: false, cursor: null };
  }

  const params = new URLSearchParams();
  if (prefix) params.set("prefix", prefix);
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));

  const res = await fetchWithTimeout(
    `${gw.gatewayUrl}/_internal/list?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${gw.gatewayToken}` },
    },
    15_000
  );

  if (!res.ok) {
    throw new Error(`Cloudflare R2 list failed (${res.status})`);
  }

  const data = (await res.json()) as Partial<R2ListResult>;
  return {
    objects: Array.isArray(data.objects) ? data.objects : [],
    truncated: Boolean(data.truncated),
    cursor: data.cursor || null,
  };
}

export async function deleteR2Objects(keys: string[]): Promise<number> {
  const cleanKeys = (keys || []).map((k) => String(k || "").replace(/^\/+/, "")).filter(Boolean);
  if (cleanKeys.length === 0) return 0;

  const gw = getGatewayConfig();
  if (!gw.configured) return 0;

  const res = await fetchWithTimeout(
    `${gw.gatewayUrl}/_internal/delete-batch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gw.gatewayToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys: cleanKeys }),
    },
    20_000
  );

  if (!res.ok) {
    throw new Error(`Cloudflare R2 batch delete failed (${res.status})`);
  }

  const data = (await res.json().catch(() => ({}))) as { deleted?: number };
  return typeof data.deleted === "number" ? data.deleted : cleanKeys.length;
}

