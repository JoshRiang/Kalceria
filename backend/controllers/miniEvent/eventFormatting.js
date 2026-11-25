import { splitMediaUrlList } from '../../utils/urlSecurity.js';

export const MINI_EVENT_PERMANENT_EXPIRES_AT = new Date('2099-01-01T00:00:00.000Z');
export const MINI_EVENT_CLIP_TTL_MS = 24 * 60 * 60 * 1000;

const MINOR_TITLE_WORDS = new Set([
  'dan', 'atau', 'serta', 'tetapi', 'tapi', 'namun', 'melainkan', 'padahal', 'sedangkan',
  'yang', 'untuk', 'bagi', 'guna', 'buat', 'demi', 'agar', 'supaya', 'biar',
  'karena', 'sebab', 'lantaran', 'sehingga', 'maka',
  'jika', 'kalau', 'jikalau', 'apabila', 'bila', 'bilamana', 'seandainya', 'asalkan', 'asal',
  'meski', 'meskipun', 'walau', 'walaupun', 'kendati', 'kendatipun', 'biarpun', 'sekalipun', 'sungguhpun',
  'ketika', 'saat', 'waktu', 'tatkala', 'sementara', 'sambil', 'seraya',
  'sebelum', 'sesudah', 'setelah', 'sejak', 'selama', 'hingga', 'sampai',
  'seperti', 'bagai', 'bagaikan', 'ibarat', 'laksana', 'bak', 'alih-alih',
  'di', 'ke', 'dari', 'pada', 'kepada', 'daripada', 'oleh', 'dengan', 'tanpa',
  'tentang', 'mengenai', 'terhadap', 'antara', 'dalam', 'atas', 'bawah',
  'menuju', 'menurut', 'sekitar', 'sekeliling', 'melalui', 'lewat',
  'pun', 'per', 'via', 'vs', 'ala',
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'as', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'off', 'out',
  'vs.', 'v', 'v.', 'from', 'into', 'onto', 'upon', 'with', 'within', 'without',
  'over', 'under', 'between', 'among', 'through', 'during', 'before', 'after', 'since', 'until', 'till',
  'about', 'against', 'around', 'behind', 'beside', 'besides', 'beyond', 'despite', 'down', 'except',
  'inside', 'near', 'outside', 'past', 'toward', 'towards', 'underneath', 'unlike',
  'than', 'that', 'when', 'while', 'if', 'though', 'although',
]);

export function toSmartTitleCase(value) {
  const cleaned = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((word, idx) => {
      const match = word.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9][a-zA-Z0-9'-]*?)([^a-zA-Z0-9]*)$/);
      if (!match) return word;
      const [, prefix, core, suffix] = match;
      const lower = core.toLowerCase();
      if (idx > 0 && MINOR_TITLE_WORDS.has(lower)) {
        return `${prefix}${lower}${suffix}`;
      }
      if (
        core.length >= 2 &&
        core.length <= 5 &&
        core === core.toUpperCase() &&
        /[A-Z]/.test(core) &&
        !MINOR_TITLE_WORDS.has(lower)
      ) {
        return `${prefix}${core}${suffix}`;
      }
      return `${prefix}${lower.charAt(0).toUpperCase()}${lower.slice(1)}${suffix}`;
    })
    .join(' ');
}

export function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function stripEncodedTags(raw) {
  return String(raw || '')
    .replace(/\[CAT:[a-z_]+\]\s*/gi, '')
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, '')
    .replace(/\[CMETA:[^\]]+\]\s*/gi, '')
    .replace(/\[LOC:[^\]]+\]\s*/gi, '')
    .replace(/\[COLLABS:[^\]]+\]\s*/gi, '')
    .trim();
}

export function encodeClipMetaTag(clips) {
  const safe = Array.isArray(clips) ? clips.filter((c) => c && c.url) : [];
  if (safe.length === 0) return '';
  const compact = safe.map((c) => {
    const entry = {
      i: c.id || '',
      u: c.url,
      t: Number(c.uploadedAt) || Date.now(),
    };
    if (Number.isFinite(Number(c.width)) && Number(c.width) > 0) entry.w = Math.round(Number(c.width));
    if (Number.isFinite(Number(c.height)) && Number(c.height) > 0) entry.h = Math.round(Number(c.height));
    if (Number.isFinite(Number(c.duration)) && Number(c.duration) > 0) entry.d = Number(Number(c.duration).toFixed(3));
    if (c.authorId) entry.a = String(c.authorId);
    if (c.authorName) entry.n = String(c.authorName).slice(0, 60);
    if (c.authorAvatarUrl) entry.p = String(c.authorAvatarUrl);
    return entry;
  });
  return Buffer.from(JSON.stringify(compact), 'utf8').toString('base64url');
}

export function decodeClipMetaTag(rawBase64) {
  if (!rawBase64 || typeof rawBase64 !== 'string') return null;
  try {
    const json = Buffer.from(rawBase64.trim(), 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function extractEncodedTags(raw) {
  const text = String(raw || '');
  const catMatch = text.match(/\[CAT:([a-z_]+)\]/i);
  const mediaMatch = text.match(/\[MEDIA:([^\]]+)\]/i);
  const clipMetaMatch = text.match(/\[CMETA:([^\]]+)\]/i);
  const locMatch = text.match(/\[LOC:([^\]]+)\]/i);
  const collabsMatch = text.match(/\[COLLABS:([^\]]+)\]/i);
  return {
    category: catMatch ? catMatch[1].toLowerCase() : null,
    mediaStr: mediaMatch ? mediaMatch[1] : '',
    clipMetaStr: clipMetaMatch ? clipMetaMatch[1] : '',
    location: locMatch ? locMatch[1].trim() : null,
    collaborators: collabsMatch
      ? collabsMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    plainDescription: stripEncodedTags(text),
  };
}

export function buildEncodedDescription({
  category,
  location,
  mediaUrls = [],
  mediaClips = null,
  plainDescription = '',
}) {
  const parts = [];
  const cleanCat = cleanText(category) || 'cafe';
  parts.push(`[CAT:${cleanCat}]`);
  const cleanLoc = cleanText(location);
  if (cleanLoc) parts.push(`[LOC:${cleanLoc}]`);
  const urls = Array.isArray(mediaClips) && mediaClips.length > 0
    ? mediaClips.map((c) => c?.url).filter(Boolean)
    : (Array.isArray(mediaUrls) ? mediaUrls.filter(Boolean) : []);
  if (urls.length > 0) {
    parts.push(`[MEDIA:${urls.join(', ')}]`);
  }
  if (Array.isArray(mediaClips) && mediaClips.length > 0) {
    const encoded = encodeClipMetaTag(mediaClips);
    if (encoded) parts.push(`[CMETA:${encoded}]`);
  }
  const cleanPlain = cleanText(plainDescription);
  if (cleanPlain) parts.push(cleanPlain);
  return parts.join(' ').trim();
}

function extractEmbeddedTimestampFromUrl(rawUrl) {
  const str = String(rawUrl || '').trim();
  if (!str) return null;
  let candidatePath = str;
  try {
    const parsed = new URL(str, 'https://kalceria.internal');
    if (parsed.pathname === '/api/blob/raw') {
      const inner = parsed.searchParams.get('url');
      if (inner) candidatePath = new URL(inner).pathname;
    } else {
      candidatePath = parsed.pathname;
    }
  } catch {}
  const match = candidatePath.match(/(?:^|\/)(\d{13})-[a-zA-Z0-9._-]+/);
  if (!match) return null;
  const ts = Number(match[1]);
  return Number.isFinite(ts) && ts > 1_600_000_000_000 && ts < 4_102_444_800_000 ? ts : null;
}

export function extractUrlsFromLegacyMediaString(rawMediaStr) {
  if (!rawMediaStr || typeof rawMediaStr !== 'string') return [];
  return splitMediaUrlList(rawMediaStr)
    .map((entry) => {
      const pipeIdx = entry.lastIndexOf('|');
      if (pipeIdx > 0) {
        const maybeTs = Number(entry.slice(pipeIdx + 1).trim());
        if (Number.isFinite(maybeTs) && maybeTs > 1_000_000_000_000) {
          return {
            url: entry.slice(0, pipeIdx).trim(),
            uploadedAt: maybeTs,
          };
        }
      }
      const cleanUrl = entry.trim();
      return { url: cleanUrl, uploadedAt: extractEmbeddedTimestampFromUrl(cleanUrl) };
    })
    .filter((item) => Boolean(item.url));
}

export function validateMiniEvent({ title, description, lat, lng }) {
  if (!title) return 'Title is required.';
  if (title.length > 80) return 'Title must be 80 characters or less.';
  const plainDesc = stripEncodedTags(description);
  if (plainDesc.length > 240) {
    return 'Description must be 240 characters or less.';
  }
  if (lat === null || lng === null) return 'Valid lat and lng are required.';
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return 'Valid lat and lng are required.';
  }
  return null;
}

export function formatMiniEventResponse(ev, hydrated = {}) {
  const tags = extractEncodedTags(ev.description);
  const mediaItems = Array.isArray(hydrated.mediaItems) ? hydrated.mediaItems : [];
  const mediaUrl =
    mediaItems.length > 0
      ? mediaItems.map((item) => item.url).join(', ')
      : hydrated.mediaUrl !== undefined
        ? hydrated.mediaUrl
        : null;
  const collaborators = Array.isArray(hydrated.collaborators)
    ? hydrated.collaborators
    : tags.collaborators;
  const collaboratorProfiles = Array.isArray(hydrated.collaboratorProfiles)
    ? hydrated.collaboratorProfiles
    : [];
  const pendingRequestsCount = Number.isFinite(hydrated.pendingRequestsCount)
    ? hydrated.pendingRequestsCount
    : 0;

  return {
    ...ev,
    title: ev.title ? toSmartTitleCase(ev.title) : ev.title,
    category: tags.category || ev.category || 'cafe',
    mediaUrl,
    mediaItems,
    collaborators,
    collaboratorProfiles,
    pendingRequestsCount,
    location: tags.location || ev.location || null,
    description: tags.plainDescription,
  };
}

