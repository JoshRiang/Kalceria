/**
 * [TEMPORARY FEATURE FLAG] Express Router Guard for Map Endpoints
 *
 * Preserves canonical HTTP 401 responses from downstream `requireAuth` when
 * unauthenticated, while returning HTTP 403 (`MAP_WHITELIST_REQUIRED`) for any
 * authenticated non-whitelisted user attempting to access Map APIs directly.
 */

import { getRequestToken, verifyAuthSession } from '../utils/authSession.js';
import { TEMP_MAP_WHITELIST_ENABLED, isEmailWhitelistedForMap } from './config.js';

export const TEMP_MAP_GUARDED_PATHS = Object.freeze([
  '/map',
  '/mini-events',
  '/broadcast',
  '/location/update',
  '/location/visibility',
  '/location/nearby',
]);

export function createTempMapWhitelistGuard({
  enabled = TEMP_MAP_WHITELIST_ENABLED,
  getToken = getRequestToken,
  verifySession = verifyAuthSession,
} = {}) {
  return async function tempMapWhitelistGuard(req, res, next) {
    if (!enabled) return next();

    const token = getToken(req);
    const fullUrl = String(req.originalUrl || req.url || '');
    const isOptionalAuthBroadcastView =
      fullUrl.includes('/broadcast/') && fullUrl.includes('/view');

    if (!token) {
      if (isOptionalAuthBroadcastView) {
        return res.status(403).json({
          error: 'Kalcerians Map is coming soon. Access is currently limited to whitelisted preview accounts.',
          code: 'MAP_WHITELIST_REQUIRED',
        });
      }
      // Let downstream requireAuth return canonical HTTP 401.
      return next();
    }

    const payload = await verifySession(token);
    if (!payload) {
      if (isOptionalAuthBroadcastView) {
        return res.status(403).json({
          error: 'Kalcerians Map is coming soon. Access is currently limited to whitelisted preview accounts.',
          code: 'MAP_WHITELIST_REQUIRED',
        });
      }
      // Let downstream requireAuth return canonical HTTP 401.
      return next();
    }

    if (!isEmailWhitelistedForMap(payload.email, { enabled })) {
      return res.status(403).json({
        error: 'Kalcerians Map is coming soon. Access is currently limited to whitelisted preview accounts.',
        code: 'MAP_WHITELIST_REQUIRED',
      });
    }

    return next();
  };
}

export const tempMapWhitelistGuard = createTempMapWhitelistGuard();

