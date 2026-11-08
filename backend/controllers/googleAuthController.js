import { setAuthCookie } from '../utils/authSession.js';
import { issueLoginCsrfToken } from './authController.js';
import {
  isGoogleOAuthConfigured,
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleJwks,
  verifyGoogleIdTokenWithJwks,
  handleGoogleOAuthStart,
  handleGoogleOAuthExchange,
  STATE_TTL_SECONDS,
} from './googleAuth/index.js';

export {
  isGoogleOAuthConfigured,
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleJwks,
  verifyGoogleIdTokenWithJwks,
  handleGoogleOAuthStart,
  handleGoogleOAuthExchange,
};

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
