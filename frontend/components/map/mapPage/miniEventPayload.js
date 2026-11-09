/**
 * frontend/components/map/mapPage/miniEventPayload.js
 *
 * Pure payload formatter for Mini Event create & update requests.
 * Zero React dependencies, zero side-effects.
 *
 * Source: MapPageClient.jsx (L1071-L1143)
 */

export function buildMediaItemsPayload(mediaUrl = '', mediaMetadataByUrl = {}, splitMediaUrlListFn) {
  const clipUrls = splitMediaUrlListFn
    ? splitMediaUrlListFn(mediaUrl)
    : (mediaUrl ? mediaUrl.split(',').map((s) => s.trim()).filter(Boolean) : []);

  return clipUrls.map((url) => {
    const m = mediaMetadataByUrl?.[url] || {};
    return {
      url,
      ...(m.width ? { width: m.width } : {}),
      ...(m.height ? { height: m.height } : {}),
      ...(m.duration ? { duration: m.duration } : {}),
    };
  });
}

export function buildMiniEventPayload(
  { eventForm = {}, currentLat, currentLng, locationName = '' },
  { splitMediaUrlListClientFn, toSmartTitleCaseFn } = {}
) {
  const category = eventForm.category || 'cafe';
  const mediaUrl = (eventForm.mediaUrl || '').trim();
  const mediaItemsPayload = buildMediaItemsPayload(mediaUrl, eventForm.mediaMetadataByUrl, splitMediaUrlListClientFn);
  const cleanDesc = (eventForm.description || '')
    .replace(/\[CAT:[a-z_]+\]\s*/gi, '')
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, '')
    .replace(/\[LOC:[^\]]+\]\s*/gi, '')
    .replace(/\[COLLABS:[^\]]+\]\s*/gi, '')
    .trim();

  let encodedDesc = `[CAT:${category}] ${cleanDesc}`.trim();
  if (locationName) {
    encodedDesc = `[LOC:${locationName}] ${encodedDesc}`.trim();
  }
  if (mediaUrl) {
    encodedDesc = `[MEDIA:${mediaUrl}] ${encodedDesc}`.trim();
  }

  const formattedTitle = toSmartTitleCaseFn ? toSmartTitleCaseFn(eventForm.title || '') : (eventForm.title || '');
  return {
    title: formattedTitle,
    description: encodedDesc,
    category,
    mediaUrl,
    mediaItems: mediaItemsPayload,
    ...(eventForm.mediaSyncedAt ? { mediaSyncedAt: eventForm.mediaSyncedAt } : {}),
    location: locationName,
    lat: currentLat,
    lng: currentLng,
  };
}

