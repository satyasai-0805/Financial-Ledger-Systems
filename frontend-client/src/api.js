import axios from 'axios';

// Clean and normalize baseURL to guarantee it always points to /api
let rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').trim().replace(/\/+$/, '');
if (!rawBaseUrl.endsWith('/api')) {
  rawBaseUrl += '/api';
}

const api = axios.create({
  baseURL: rawBaseUrl,
});

// Request interceptor for adding the token
api.interceptors.request.use(
  (config) => {
    // We will get the token from a global variable, memory, or context.
    // However, axios interceptors don't easily access React state directly.
    // So we can expose a function to set the token or read it from localStorage
    // The user requested: "stores the returned JWT (in memory/context, not localStorage, for better security)"
    // To pass the token, we can export a setter function from api.js
    const token = window.inMemoryToken;
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401s globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token
      window.inMemoryToken = null;
      // Trigger a custom event that AuthProvider can listen to for redirect
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Utility to set token
export const setToken = (token) => {
  window.inMemoryToken = token;
};

// Utility to clear token
export const clearToken = () => {
  window.inMemoryToken = null;
};

export default api;
