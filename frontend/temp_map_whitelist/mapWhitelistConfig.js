/**
 * [TEMPORARY FEATURE FLAG] Map Access Email Whitelist — Pure Frontend Config
 *
 * Intentionally pure (no React, no `@/` imports) so it can be verified
 * directly by native `node --test` (Gate 3b) as well as Next.js client bundles.
 *
 * Delete `frontend/temp_map_whitelist/` when Kalcerians Map launches publicly.
 */

export const TEMP_MAP_WHITELIST_ENABLED =
  String(process.env.NEXT_PUBLIC_TEMP_MAP_WHITELIST_ENABLED ?? "true")
    .trim()
    .toLowerCase() !== "false";

export const TEMP_MAP_WHITELIST_EMAILS = Object.freeze([
  "reinathanezhekiel1@gmail.com",
  "varsikurniawan@gmail.com",
]);

export function normalizeWhitelistEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function extractUserEmail(userObj) {
  if (!userObj) return "";
  if (typeof userObj === "string") return normalizeWhitelistEmail(userObj);
  return normalizeWhitelistEmail(userObj.email || userObj?.user?.email || "");
}

export function isEmailWhitelistedForMap(
  email,
  { enabled = TEMP_MAP_WHITELIST_ENABLED } = {}
) {
  if (!enabled) return true;
  const clean = normalizeWhitelistEmail(email);
  if (!clean) return false;
  return TEMP_MAP_WHITELIST_EMAILS.includes(clean);
}

export function canUserAccessMap(
  { isLoggedIn = false, user = null } = {},
  { enabled = TEMP_MAP_WHITELIST_ENABLED } = {}
) {
  if (!enabled) return true;
  if (!isLoggedIn) return false;
  return isEmailWhitelistedForMap(extractUserEmail(user), { enabled });
}

