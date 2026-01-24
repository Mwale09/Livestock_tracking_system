import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://livestock-tracking-system.onrender.com";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for session-based authentication
});

// Request interceptor to add CSRF token
api.interceptors.request.use(
  async (config) => {
    // Get CSRF token for POST/PUT/DELETE requests
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/csrf-token/`, {
          withCredentials: true
        });
        config.headers['X-CSRFToken'] = response.data.csrfToken;
      } catch (error) {
        console.warn('Failed to get CSRF token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const onLoginPage = window.location.pathname.startsWith('/login');
    const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/register') || url.includes('/api/auth/user');
    if (status === 401 && !isAuthEndpoint && !onLoginPage) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const animalsAPI = {
  getAll: () => api.get('/api/tracking/animals/'),
  getById: (id) => api.get(`/api/tracking/animals/${id}/`),
  create: (data, config) => api.post('/api/tracking/animals/', data, config),
  update: (id, data, config) => api.put(`/api/tracking/animals/${id}/`, data, config),
  updatePartial: (id, data, config) => api.patch(`/api/tracking/animals/${id}/`, data, config),
  delete: (id) => api.delete(`/api/tracking/animals/${id}/`),
  getLocationHistory: (id, params) => api.get(`/api/tracking/animals/${id}/location_history/`, { params }),
  activateBuzzer: (id) => api.post(`/api/tracking/animals/${id}/activate_buzzer/`),
  requestSMS: (id, data) => api.post(`/api/tracking/animals/${id}/request_sms/`, data),
};

export const devicesAPI = {
  getAll: () => api.get('/api/tracking/devices/'),
  getById: (id) => api.get(`/api/tracking/devices/${id}/`),
  getOnline: () => api.get('/api/tracking/devices/online_devices/'),
  getOffline: () => api.get('/api/tracking/devices/offline_devices/'),
};

export const locationsAPI = {
  getAll: () => api.get('/api/tracking/locations/'),
  getCurrent: () => api.get('/api/tracking/locations/current_locations/'),
};

export const notificationsAPI = {
  getAll: () => api.get('/api/notifications/notifications/'),
  getById: (id) => api.get(`/api/notifications/notifications/${id}/`),
  markAsRead: (id) => api.post(`/api/notifications/notifications/${id}/mark_as_read/`),
  markAllAsRead: () => api.post('/api/notifications/notifications/mark_all_as_read/'),
  getUnreadCount: () => api.get('/api/notifications/notifications/unread_count/'),
  getStats: () => api.get('/api/notifications/notifications/stats/'),
};

export const settingsAPI = {
  get: () => api.get('/api/notifications/settings/'),
  update: (data) => api.post('/api/notifications/settings/', data),
};

export const authAPI = {
  login: (credentials) => api.post('/api/auth/login/', credentials),
  logout: () => api.post('/api/auth/logout/'),
  register: (userData) => api.post('/api/auth/register/', userData),
  getUser: () => api.get('/api/auth/user/'),
};

export { api };

