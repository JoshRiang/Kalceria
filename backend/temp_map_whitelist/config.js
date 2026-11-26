/**
 * [TEMPORARY FEATURE FLAG] Map Access Email Whitelist — Backend SSOT
 *
 * Delete `backend/temp_map_whitelist/` and remove the 2-line mount in
 * `backend/routes/index.js` when Kalcerians Map opens publicly.
 */

export const TEMP_MAP_WHITELIST_ENABLED =
  String(process.env.TEMP_MAP_WHITELIST_ENABLED ?? 'true').trim().toLowerCase() !== 'false';

export const TEMP_MAP_WHITELIST_EMAILS = Object.freeze([
  'reinathanezhekiel1@gmail.com',
  'varsikurniawan@gmail.com',
]);

export function normalizeWhitelistEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isEmailWhitelistedForMap(email, { enabled = TEMP_MAP_WHITELIST_ENABLED } = {}) {
  if (!enabled) return true;
  const clean = normalizeWhitelistEmail(email);
  if (!clean) return false;
  return TEMP_MAP_WHITELIST_EMAILS.includes(clean);
}

