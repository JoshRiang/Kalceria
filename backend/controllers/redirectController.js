import { getRequestToken, verifyAuthSession } from '../utils/authSession.js';

// ─── GET /redirect/event/:eventId ─────────────────────────────────────────────
export async function redirectEvent(req, res) {
  const { eventId } = req.params;
  const configuredFrontend = process.env.FRONTEND_URL?.split(',')[0]?.trim();
  if (!configuredFrontend) return res.status(503).json({ error: 'Frontend URL is not configured.' });

  let frontend;
  try {
    frontend = new URL(configuredFrontend);
    if (!['https:', 'http:'].includes(frontend.protocol)) throw new Error('Unsupported frontend URL protocol.');
  } catch {
    return res.status(503).json({ error: 'Frontend URL is not configured.' });
  }

  const encodedEventId = encodeURIComponent(eventId);
  const loginUrl = new URL(`/login?next=/event/${encodedEventId}/register`, frontend);
  const registerUrl = new URL(`/event/${encodedEventId}/register`, frontend);

  try {
    const payload = await verifyAuthSession(getRequestToken(req));
    if (!payload) return res.redirect(302, loginUrl.href);

    // Valid — redirect to register page
    return res.redirect(302, registerUrl.href);
  } catch {
    return res.redirect(302, loginUrl.href);
  }
}
