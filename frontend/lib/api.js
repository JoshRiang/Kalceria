import axios from 'axios';

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
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => {
    return res;
  },
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.error || err.message || 'Network Error';

    if (status === 401 && typeof window !== 'undefined' && !String(err.config?.url || '').includes('/auth/login')) {
      localStorage.removeItem('kalceriaSessionActive');
      localStorage.removeItem('kalceriaAdminSessionActive');
      sessionStorage.removeItem('kalceriaCsrfToken');
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

// map helpers
export const fetchMe = () => api.get('/users/me').then(r => r.data.user);
export const fetchMapUsers = () => api.get('/map/users').then(r => r.data.users);
export const fetchKalcerians = () => api.get('/map/kalcerians').then(r => r.data.kalcerians);
export const fetchMiniEvents = () => api.get('/mini-events/active').then(r => r.data.events);
export const postBroadcast = (message) => api.post('/broadcast', { message });
export const putBroadcast = (message) => api.put('/broadcast', { message });
export const delBroadcast = () => api.delete('/broadcast');
export const postLocation = (lat, lng) => api.post('/location/update', { lat, lng });
export const patchVisibility = (allow) => api.patch('/location/visibility', { allowLiveLocation: allow });
export const postMiniEvent = (data) => api.post('/mini-events', data);
export const putMiniEvent = (id, data) => api.put(`/mini-events/${id}`, data);
export const delMiniEvent = (id) => api.delete(`/mini-events/${id}`);
