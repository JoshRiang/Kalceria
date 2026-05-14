import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network Error';
    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
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
