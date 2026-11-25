/**
 * emailUtils.js - Pure HTML & URL Sanitization Utilities for Email Templates
 *
 * 100% pure functions, zero external side-effects.
 */

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export const CANONICAL_PUBLIC_ORIGIN = 'https://www.kalceria.id';

export function resolvePublicFrontendOrigin(rawFrontendUrl = process.env.FRONTEND_URL) {
  const firstEntry = String(rawFrontendUrl || '').split(',')[0]?.trim().replace(/\/+$/, '') || '';
  if (!firstEntry || /localhost|127\.0\.0\.1/i.test(firstEntry) || !firstEntry.startsWith('https://')) {
    return CANONICAL_PUBLIC_ORIGIN;
  }
  return firstEntry;
}

export function resolveEmailPosterUrl(event, rawFrontendUrl = process.env.FRONTEND_URL, fallbackPath = '/event_3.jpg') {
  const publicBase = resolvePublicFrontendOrigin(rawFrontendUrl);
  const posterRaw = String(event?.displayPhotoUrl || event?.posterUrl || '').trim();
  let url = posterRaw;

  if (!url) {
    url = `${publicBase}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    if (/localhost|127\.0\.0\.1/i.test(url)) {
      url = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, CANONICAL_PUBLIC_ORIGIN);
    }
  } else if (url.startsWith('/')) {
    url = `${publicBase}${url}`;
  } else {
    url = `${publicBase}/${url}`;
  }

  // Convert .webp to .jpg for universal email proxy rendering (Gmail GoogleImageProxy)
  if (/\.webp(\?.*)?$/i.test(url)) {
    url = url.replace(/\.webp(\?.*)?$/i, '.jpg$1');
  }

  // Ensure query versioning to bust any CDN/proxy negative cache
  if (!url.includes('?')) {
    url = `${url}?v=kalceria`;
  }

  return url;
}
