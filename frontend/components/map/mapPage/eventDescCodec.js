/**
 * frontend/components/map/mapPage/eventDescCodec.js
 *
 * Pure event description tag parser and encoder.
 * Deduplicates the 3x repeated regex tag stripping block into 1 clean function.
 *
 * Source: MapPageClient.jsx (L1024-L1036, L1084-L1089, L1124-L1130)
 */

export function stripEventTags(rawDesc = '') {
  return String(rawDesc || '')
    .replace(/\[CAT:[a-z_]+\]\s*/gi, '')
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, '')
    .replace(/\[LOC:[^\]]+\]\s*/gi, '')
    .replace(/\[COLLABS:[^\]]+\]\s*/gi, '')
    .trim();
}

export function parseEventDesc(eventItem = {}) {
  const rawDesc = eventItem?.description || '';
  const catMatch = rawDesc.match(/\[CAT:([a-z_]+)\]/i);
  const mediaMatch = rawDesc.match(/\[MEDIA:([^\]]+)\]/i);
  const locMatch = rawDesc.match(/\[LOC:([^\]]+)\]/i);
  const category = catMatch ? catMatch[1].toLowerCase() : (eventItem?.category || 'cafe');
  const mediaUrl = eventItem?.mediaUrl || (mediaMatch ? mediaMatch[1] : '');
  const location = eventItem?.location || (locMatch ? locMatch[1] : '');
  const cleanDesc = stripEventTags(rawDesc);
  return { category, mediaUrl, location, cleanDesc };
}

export function encodeEventDesc({ category = 'cafe', cleanDesc = '', locationName = '', mediaUrl = '' }) {
  let encodedDesc = `[CAT:${category}] ${cleanDesc}`.trim();
  if (locationName) {
    encodedDesc = `[LOC:${locationName}] ${encodedDesc}`.trim();
  }
  if (mediaUrl) {
    encodedDesc = `[MEDIA:${mediaUrl}] ${encodedDesc}`.trim();
  }
  return encodedDesc;
}

