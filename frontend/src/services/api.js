import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

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
        const response = await axios.get(`${API_BASE_URL}/auth/csrf-token/`, {
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
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/user');
    if (status === 401 && !isAuthEndpoint && !onLoginPage) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const animalsAPI = {
  getAll: () => api.get('/tracking/animals/'),
  getById: (id) => api.get(`/tracking/animals/${id}/`),
  create: (data, config) => api.post('/tracking/animals/', data, config),
  update: (id, data, config) => api.put(`/tracking/animals/${id}/`, data, config),
  updatePartial: (id, data, config) => api.patch(`/tracking/animals/${id}/`, data, config),
  delete: (id) => api.delete(`/tracking/animals/${id}/`),
  getLocationHistory: (id, params) => api.get(`/tracking/animals/${id}/location_history/`, { params }),
  activateBuzzer: (id) => api.post(`/tracking/animals/${id}/activate_buzzer/`),
  requestSMS: (id, data) => api.post(`/tracking/animals/${id}/request_sms/`, data),
};

export const devicesAPI = {
  getAll: () => api.get('/tracking/devices/'),
  getById: (id) => api.get(`/tracking/devices/${id}/`),
  getOnline: () => api.get('/tracking/devices/online_devices/'),
  getOffline: () => api.get('/tracking/devices/offline_devices/'),
};

export const locationsAPI = {
  getAll: () => api.get('/tracking/locations/'),
  getCurrent: () => api.get('/tracking/locations/current_locations/'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications/notifications/'),
  getById: (id) => api.get(`/notifications/notifications/${id}/`),
  markAsRead: (id) => api.post(`/notifications/notifications/${id}/mark_as_read/`),
  markAllAsRead: () => api.post('/notifications/notifications/mark_all_as_read/'),
  getUnreadCount: () => api.get('/notifications/notifications/unread_count/'),
  getStats: () => api.get('/notifications/notifications/stats/'),
};

export const settingsAPI = {
  get: () => api.get('/notifications/settings/'),
  update: (data) => api.post('/notifications/settings/', data),
};

export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: () => api.post('/auth/logout/'),
  register: (userData) => api.post('/auth/register/', userData),
  getUser: () => api.get('/auth/user/'),
};

export { api };

