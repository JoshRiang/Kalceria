import axios from 'axios';
import { clearSession, touchSession } from './session';

const isProduction = process.env.NODE_ENV === 'production';
const apiBaseUrl = isProduction
  ? '/api'
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (typeof window !== 'undefined') {
  // Remove legacy bearer tokens; the server now authenticates with HttpOnly cookies.
  localStorage.removeItem('token');
  localStorage.removeItem('adminToken');
}

let csrfRequest;
const SAFE_METHODS = new Set(['get', 'head', 'options']);

async function getCsrfToken() {
  if (typeof window === 'undefined') return null;
  const cookieToken = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrfToken='))
    ?.slice('csrfToken='.length);
  if (cookieToken) {
    sessionStorage.setItem('kalceriaCsrfToken', decodeURIComponent(cookieToken));
    return decodeURIComponent(cookieToken);
  }
  if (!csrfRequest) {
    csrfRequest = api.get('/auth/csrf')
      .then((response) => response.data?.csrfToken || null)
      .finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined' && !SAFE_METHODS.has((config.method || 'get').toLowerCase())) {
    const token = await getCsrfToken();
    if (token) config.headers['x-csrf-token'] = token;

    try {
      let tag = localStorage.getItem('kalceria_device_tag');
      if (!tag) {
        tag = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem('kalceria_device_tag', tag);
      }
      if (tag && !config.headers['x-client-fingerprint']) {
        config.headers['x-client-fingerprint'] = tag;
      }
    } catch {}
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => {
    touchSession();
    return res;
  },
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.error || err.message || 'Network Error';

    if (status === 401 && typeof window !== 'undefined' && !String(err.config?.url || '').includes('/auth/login')) {
      clearSession();
    }

    // Silently pass JIT and expected authentication rejections.
    const isExpectedJitRejection = status === 403 && typeof message === 'string' && message.includes('JIT');
    const isAuthError = (status === 401 || status === 403) && (message.includes('No token') || message.includes('Invalid'));

    if (!isExpectedJitRejection && !isAuthError) {
      console.error('[API Error]', message);
    }

    return Promise.reject(err); // Always preserve the original error object for status checks
  }
);

export default api;

async function fetchAllPages(path, responseKey, pageSize) {
  const items = [];
  let cursor;

  do {
    const params = { limit: pageSize };
    if (cursor) params.cursor = cursor;

    const response = await api.get(path, { params });
    if (!response.data || typeof response.data !== 'object') {
      break;
    }
    const pageItems = response.data?.[responseKey];
    if (Array.isArray(pageItems)) items.push(...pageItems);

    const nextCursor = response.data?.nextCursor || null;
    if (nextCursor && nextCursor === cursor) {
      throw new Error(`Pagination cursor did not advance for ${path}.`);
    }
    cursor = nextCursor;
  } while (cursor);

  return items;
}

// map helpers
export const fetchMe = () => api.get('/users/me').then(r => r.data.user);
export const fetchMapUsers = () => api.get('/map/users').then(r => r.data.users);
export const fetchKalcerians = () => api.get('/map/kalcerians').then(r => r.data.kalcerians);
export const fetchMiniEvents = () => fetchAllPages('/mini-events/active', 'events', 100);
export async function fetchMiniEventsWithMeta() {
  const items = [];
  let cursor;
  let requestedEventId = null;
  let isFirstPage = true;

  do {
    const params = { limit: 100 };
    if (cursor) params.cursor = cursor;

    const response = await api.get('/mini-events/active', { params });
    if (!response.data || typeof response.data !== 'object') {
      break;
    }
    if (isFirstPage) {
      requestedEventId = response.data?.requestedEventId || null;
      isFirstPage = false;
    }
    const pageItems = response.data?.events;
    if (Array.isArray(pageItems)) items.push(...pageItems);

    const nextCursor = response.data?.nextCursor || null;
    if (nextCursor && nextCursor === cursor) {
      throw new Error('Pagination cursor did not advance for /mini-events/active.');
    }
    cursor = nextCursor;
  } while (cursor);

  return { events: items, requestedEventId };
}
export const requestEventCollab = (eventId) =>
  api.post(`/mini-events/${eventId}/collab/request`).then((r) => r.data);
export const cancelEventCollabRequest = (eventId) =>
  api.delete(`/mini-events/${eventId}/collab/request`).then((r) => r.data);
export const fetchEventCollabRequests = (eventId) =>
  api.get(`/mini-events/${eventId}/collab/requests`).then((r) => r.data?.requests || []);
export const acceptEventCollab = (eventId, requestId) =>
  api.post(`/mini-events/${eventId}/collab/requests/${requestId}/accept`).then((r) => r.data);
export const declineEventCollab = (eventId, requestId) =>
  api.post(`/mini-events/${eventId}/collab/requests/${requestId}/decline`).then((r) => r.data);
export const addEventMedia = (eventId, payload) =>
  api.post(`/mini-events/${eventId}/media`, payload).then((r) => r.data);
export const removeEventMedia = (eventId, payload) =>
  api.delete(`/mini-events/${eventId}/media`, { data: payload }).then((r) => r.data);
export const fetchPublicEvents = () => fetchAllPages('/events', 'events', 50);
export const fetchBlockedUsers = () => api.get('/map/blocked').then(r => r.data?.blockedUsers || []).catch(() => []);
export const blockKalcerian = (targetId) => api.post(`/map/block/${targetId}`).then(r => r.data);
export const unblockKalcerian = (targetId) => api.delete(`/map/block/${targetId}`).then(r => r.data);
export const fetchFavouriteUsers = () => api.get('/map/favourites').then(r => r.data?.favouriteUsers || []).catch(() => []);
export const favouriteKalcerian = (targetId) => api.post(`/map/favourite/${targetId}`).then(r => r.data);
export const unfavouriteKalcerian = (targetId) => api.delete(`/map/favourite/${targetId}`).then(r => r.data);
export const fetchMutedUsers = () => api.get('/map/muted').then(r => r.data?.mutedUsers || []).catch(() => []);
export const muteKalcerian = (targetId) => api.post(`/map/mute/${targetId}`).then(r => r.data);
export const unmuteKalcerian = (targetId) => api.delete(`/map/mute/${targetId}`).then(r => r.data);
export const fetchPersonalChatMessages = (targetId, params = {}) =>
  api.get(`/map/chat/${targetId}`, { params }).then(r => r.data?.messages || []).catch(() => []);
export const fetchPersonalChatPage = (targetId, params = {}) =>
  api.get(`/map/chat/${targetId}`, { params }).then(r => r.data || { messages: [], nextCursor: null }).catch(() => ({ messages: [], nextCursor: null }));
export const postPersonalChatMessage = (targetId, envelope) => api.post(`/map/chat/${targetId}`, envelope).then(r => r.data);
export const ackPersonalChatRead = (targetId, payload) =>
  api.post(`/map/chat/${targetId}/read`, payload).then(r => r.data).catch(() => ({ ok: false }));
export const postChatRtcSignal = (targetId, payload) =>
  api.post(`/map/chat/${targetId}/rtc-signal`, payload).then(r => r.data).catch(() => ({ ok: false }));
export const fetchChatRtcSignals = (targetId) =>
  api.get(`/map/chat/${targetId}/rtc-signal`).then(r => r.data?.signals || []).catch(() => []);
export const fetchPersonalChatInboxSummary = (params = {}) =>
  api.get('/map/chat-inbox/summary', { params }).then(r => r.data || { ok: false }).catch(() => ({ ok: false }));
export const deletePersonalChatMessages = (targetId, payload) => api.delete(`/map/chat/${targetId}`, { data: payload }).then(r => r.data);
export const postCallSignal = (targetId, payload) => api.post(`/map/call/${targetId}/signal`, payload).then(r => r.data);
export const fetchCallSignals = (params = {}) => api.get('/map/call/signals', { params }).then(r => r.data || { ok: false, signals: [] }).catch(() => ({ ok: false, signals: [] }));
export const clearCallSignals = () => api.delete('/map/call/signals').then(r => r.data || { ok: false }).catch(() => ({ ok: false }));
export const fetchLiveKitCallToken = (targetId, params = {}) =>
  api.get(`/map/call/${targetId}/livekit-token`, { params }).then(r => r.data || { ok: false }).catch(() => ({ ok: false }));
export const postBroadcast = (message) => api.post('/broadcast', { message });
export const putBroadcast = (message) => api.put('/broadcast', { message });
export const delBroadcast = () => api.delete('/broadcast');
export const postLocation = (lat, lng) => api.post('/location/update', { lat, lng });
export const patchVisibility = (allow) => api.patch('/location/visibility', { allowLiveLocation: allow });
export const postMiniEvent = (data) => api.post('/mini-events', data);
export const putMiniEvent = (id, data) => api.put(`/mini-events/${id}`, data);
export const delMiniEvent = (id) => api.delete(`/mini-events/${id}`);

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

const MIME_EXT_MAP = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/x-m4v": "m4v",
  "video/mp4v-es": "mp4",
  "video/quicktime": "mov",
  "video/3gpp": "3gp",
  "video/webm": "webm",
  "video/x-matroska": "mkv",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
};

export const uploadBlobMedia = async (file, { purpose } = {}) => {
  if (file && file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ukuran file melebihi 25 MB. Maksimal ukuran file adalah 25 MB.");
  }

  let filename = file?.name || "";
  if (!filename || filename === "blob" || !filename.includes(".")) {
    const rawType = (file?.type || "").split(";")[0].trim().toLowerCase();
    const ext = MIME_EXT_MAP[rawType] || (rawType.startsWith("video/") ? "mp4" : "bin");
    filename = `upload-${Date.now()}.${ext}`;
  }

  // 1. Direct Client-Side S3 Upload via @vercel/blob/client
  // Bypasses Vercel's 4.5 MB Serverless Function body limit completely
  if (typeof window !== "undefined" && file) {
    try {
      const { upload } = await import("@vercel/blob/client");
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const targetPathname = purpose === "event-clip"
        ? `events/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${cleanFilename}`
        : `events/${Date.now()}-${cleanFilename}`;

      const blobResult = await upload(targetPathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });

      if (blobResult?.url) {
        const isPrivate = blobResult.url.includes(".private.blob.vercel-storage.com");
        const finalUrl = isPrivate
          ? `/api/blob/raw?url=${encodeURIComponent(blobResult.url)}`
          : blobResult.url;

        return {
          success: true,
          url: finalUrl,
          rawBlobUrl: blobResult.url,
          access: isPrivate ? "private" : "public",
          provider: "vercel-blob-client",
        };
      }
    } catch (clientErr) {
      console.warn("Client direct blob upload fallback:", clientErr?.message);
    }
  }

  // 2. Fallback to multipart server upload for smaller files or environments without client token
  const formData = new FormData();
  formData.append("file", file, filename);
  if (purpose) formData.append("purpose", purpose);
  const res = await fetch("/api/blob/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 413 || (file && file.size > 4.2 * 1024 * 1024)) {
      throw new Error(
        "File melebihi batas 4.5 MB Vercel Serverless. Tambahkan BLOB_READ_WRITE_TOKEN di Vercel Dashboard untuk direct upload hingga 25 MB, atau gunakan file di bawah 4.5 MB."
      );
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to upload media file");
  }
  return res.json();
};
