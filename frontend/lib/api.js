import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // If request is to /admin, prefer adminToken. Otherwise, use token.
    const isAdminUrl = config.url && config.url.includes('/admin');
    let token = isAdminUrl ? localStorage.getItem('adminToken') : localStorage.getItem('token');
    
    // Fallbacks
    if (!token && isAdminUrl) token = localStorage.getItem('token');
    if (!token && !isAdminUrl) token = localStorage.getItem('adminToken');

    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.error || err.message || 'Network Error';

    // Silently pass JIT rejections and Auth token errors to prevent console spam
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
