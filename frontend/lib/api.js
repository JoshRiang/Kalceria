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
    const status = err.response?.status;
    const message = err.response?.data?.error || err.message || 'Network Error';

    // Silently pass JIT rejections — these are intentional handshakes, not real errors.
    // The del() function in page.jsx catches them and handles the password prompt flow.
    const isExpectedJitRejection = status === 403 && typeof message === 'string' && message.includes('JIT');

    if (!isExpectedJitRejection) {
      console.error('[API Error]', message);
    }

    return Promise.reject(err); // Always preserve the original error object for status checks
  }
);

export default api;
