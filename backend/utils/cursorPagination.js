const CURSOR_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,512}$/;

export function parsePageLimit(value, defaultLimit, maxLimit) {
  if (value === undefined) return defaultLimit;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1) return null;
  return Math.min(limit, maxLimit);
}

export function decodePageCursor(value) {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || !CURSOR_PATTERN.test(value)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const timestamp = typeof parsed?.at === 'string' ? new Date(parsed.at) : null;
    if (
      typeof parsed?.id !== 'string'
      || !CURSOR_ID_PATTERN.test(parsed.id)
      || !timestamp
      || !Number.isFinite(timestamp.getTime())
    ) {
      return false;
    }

    return { id: parsed.id, at: timestamp };
  } catch {
    return false;
  }
}

export function encodePageCursor({ id, at }) {
  return Buffer.from(JSON.stringify({ id, at: new Date(at).toISOString() })).toString('base64url');
}
