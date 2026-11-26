import axios from 'axios';
import { clearSession, touchSession } from './session';
import { normalizeUploadErrorMessage } from './mediaUploadHelpers';

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
export const fetchFriendsState = () =>
  api.get('/map/friends').then((r) => ({
    friendIds: Array.isArray(r.data?.friendIds) ? r.data.friendIds.map(String) : [],
    outgoingRequestIds: Array.isArray(r.data?.outgoingRequestIds) ? r.data.outgoingRequestIds.map(String) : [],
    incomingRequestIds: Array.isArray(r.data?.incomingRequestIds) ? r.data.incomingRequestIds.map(String) : [],
  })).catch(() => ({ friendIds: [], outgoingRequestIds: [], incomingRequestIds: [] }));
export const sendFriendRequest = (targetId) => api.post(`/map/friends/request/${targetId}`).then((r) => r.data);
export const cancelFriendRequest = (targetId) => api.delete(`/map/friends/request/${targetId}`).then((r) => r.data);
export const acceptFriendRequest = (targetId) => api.post(`/map/friends/accept/${targetId}`).then((r) => r.data);
export const rejectFriendRequest = (targetId) => api.post(`/map/friends/reject/${targetId}`).then((r) => r.data);
export const fetchBlockedUsers = () =>
  api.get('/map/blocked').then((r) => ({
    blockedUsers: Array.isArray(r.data?.blockedUsers) ? r.data.blockedUsers.map(String) : [],
    blockedByUsers: Array.isArray(r.data?.blockedByUsers) ? r.data.blockedByUsers.map(String) : [],
  }));
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
export const postBroadcast = (payload) =>
  api.post('/broadcast', typeof payload === 'string' ? { message: payload } : payload);
export const putBroadcast = (payload) =>
  api.put('/broadcast', typeof payload === 'string' ? { message: payload } : payload);
export const delBroadcast = () => api.delete('/broadcast');
export const postLocation = (lat, lng) => api.post('/location/update', { lat, lng });
export const patchVisibility = (allow) => api.patch('/location/visibility', { allowLiveLocation: allow });
export const postMiniEvent = (data) => api.post('/mini-events', data);
export const putMiniEvent = (id, data) => api.put(`/mini-events/${id}`, data);
export const delMiniEvent = (id) => api.delete(`/mini-events/${id}`);

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB via R2 direct & chunked edge upload
const SINGLE_SHOT_THRESHOLD_BYTES = 3.4 * 1024 * 1024; // Safely under Vercel's 4.5 MB incoming request cap
const UPLOAD_CHUNK_BYTES = 3.2 * 1024 * 1024;

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

const UPLOAD_TIMEOUT_MS = 90000;

export const uploadBlobMedia = async (file, { purpose } = {}) => {
  if (file && file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ukuran file melebihi batas 10 MB. Mohon gunakan file dengan ukuran lebih kecil.");
  }

  let filename = file?.name || "";
  const rawType = (file?.type || "").split(";")[0].trim().toLowerCase();
  if (!filename || filename === "blob" || !filename.includes(".")) {
    const ext = MIME_EXT_MAP[rawType] || (rawType.startsWith("video/") ? "mp4" : "bin");
    filename = `upload-${Date.now()}.${ext}`;
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => {
        try {
          controller.abort(new Error("Waktu unggah habis. Silakan coba lagi."));
        } catch {
          controller.abort();
        }
      }, UPLOAD_TIMEOUT_MS)
    : null;

  try {
    // Chunked R2 staging path for files > 3.4 MB up to 10 MB (never hits Vercel 4.5 MB 413!)
    if (file && typeof file.slice === "function" && file.size > SINGLE_SHOT_THRESHOLD_BYTES) {
      const uploadId = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      const totalChunks = Math.ceil(file.size / UPLOAD_CHUNK_BYTES);

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * UPLOAD_CHUNK_BYTES;
        const end = Math.min(file.size, start + UPLOAD_CHUNK_BYTES);
        const slice = file.slice(start, end);
        const partForm = new FormData();
        partForm.append("chunkAction", "part");
        partForm.append("uploadId", uploadId);
        partForm.append("chunkIndex", String(chunkIndex));
        partForm.append("file", slice, `part-${chunkIndex}.bin`);

        const partRes = await fetch("/api/blob/upload", {
          method: "POST",
          body: partForm,
          signal: controller ? controller.signal : undefined,
        });
        if (!partRes.ok) {
          if (partRes.status === 413) {
            throw new Error("Ukuran file melebihi batas 10 MB. Mohon gunakan file dengan ukuran lebih kecil.");
          }
          const err = await partRes.json().catch(() => ({}));
          throw new Error(err.error || "Gagal mengunggah potongan file media.");
        }
      }

      const completeForm = new FormData();
      completeForm.append("chunkAction", "complete");
      completeForm.append("uploadId", uploadId);
      completeForm.append("totalChunks", String(totalChunks));
      completeForm.append("filename", filename);
      completeForm.append("contentType", file.type || "application/octet-stream");
      if (purpose) completeForm.append("purpose", purpose);

      const completeRes = await fetch("/api/blob/upload", {
        method: "POST",
        body: completeForm,
        signal: controller ? controller.signal : undefined,
      });
      if (!completeRes.ok) {
        if (completeRes.status === 413) {
          throw new Error("Ukuran file melebihi batas 10 MB. Mohon gunakan file dengan ukuran lebih kecil.");
        }
        const err = await completeRes.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyelesaikan unggahan file media.");
      }
      return await completeRes.json();
    }

    // Standard 1-request fast path (<= 3.4 MB)
    const formData = new FormData();
    formData.append("file", file, filename);
    if (purpose) formData.append("purpose", purpose);

    const res = await fetch("/api/blob/upload", {
      method: "POST",
      body: formData,
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) {
      if (res.status === 413) {
        throw new Error("Ukuran file melebihi batas 10 MB. Mohon gunakan file dengan ukuran lebih kecil.");
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Gagal mengunggah file media.");
    }
    return await res.json();
  } catch (err) {
    throw new Error(normalizeUploadErrorMessage(err, "Gagal mengunggah file media."));
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
