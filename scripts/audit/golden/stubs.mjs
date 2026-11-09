/**
 * scripts/audit/golden/stubs.mjs
 *
 * Deterministic, side-effect-free in-memory stubs for pure module extraction
 * and Golden-Master testing against baseline f1dbb70.
 * Zero database, zero network, zero external dependencies.
 */

export function stubToSmartTitleCase(str = '') {
  return String(str)
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

export function stubCleanEventDesc(event) {
  if (!event || typeof event !== 'object') return event;
  const rawDesc = event.description || '';
  const cleanDesc = rawDesc
    .replace(/\[CAT:[a-z_]+\]\s*/gi, '')
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, '')
    .replace(/\[LOC:[^\]]+\]\s*/gi, '')
    .replace(/\[COLLABS:[^\]]+\]\s*/gi, '')
    .trim();
  return {
    ...event,
    description: cleanDesc,
  };
}

export function stubMergeEvents(events = []) {
  if (!Array.isArray(events)) return [];
  const map = new Map();
  for (const e of events) {
    if (e && e.id) map.set(String(e.id), e);
  }
  return Array.from(map.values());
}

export function stubSplitMediaUrlListClient(mediaUrl = '') {
  if (!mediaUrl || typeof mediaUrl !== 'string') return [];
  return mediaUrl
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

export function stubHasValidCoordinates(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    Number.isFinite(nLat) &&
    Number.isFinite(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180 &&
    !(nLat === 0 && nLng === 0)
  );
}

export function stubResolvePersistentAvatarUrl(user) {
  if (!user) return null;
  return user.profilePicture || user.avatarUrl || user.image || null;
}

export function stubFormatVoiceDuration(sec = 0) {
  const total = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function stubGetChatTimeLabel(ts) {
  if (!ts) return 'Today';
  const d = new Date(Number(ts));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

