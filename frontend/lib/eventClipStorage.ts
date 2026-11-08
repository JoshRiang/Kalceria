// Shared naming contract between the upload route and the 24h clip reaper.
export const EVENT_CLIP_PURPOSE = "event-clip";
export const EVENT_CLIP_PREFIX = "event-clips/";

// A clip is visible for 24h after it is attached; the reaper only deletes blobs once they are
// older than the clip TTL plus a grace window that covers drafts uploaded before being attached.
export const EVENT_CLIP_TTL_MS = 24 * 60 * 60 * 1000;
export const EVENT_CLIP_REAP_GRACE_MS = 12 * 60 * 60 * 1000;

