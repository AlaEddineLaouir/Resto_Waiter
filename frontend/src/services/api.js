import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminTenant');
      
      // Optionally redirect to login
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// ============================================
// Public API - Chat & Menu
// ============================================

export const chatApi = {
  /**
   * Send a chat message
   * @param {string} message - User message
   * @returns {Promise<{message: string}>}
   */
  sendMessage: async (message) => {
    const response = await api.post('/api/chat', { message });
    return response.data;
  },
};

export const menuApi = {
  /**
   * Get the full menu
   * @returns {Promise<{restaurant: object, categories: array}>}
   */
  getMenu: async () => {
    const response = await api.get('/api/menu');
    return response.data;
  },

  /**
   * Search dishes
   * @param {string} query - Search query
   * @returns {Promise<{dishes: array}>}
   */
  searchDishes: async (query) => {
    const response = await api.get('/api/search', { params: { q: query } });
    return response.data;
  },

  /**
   * Get dish details
   * @param {string} dishName - Dish name
   * @returns {Promise<object>}
   */
  getDishDetails: async (dishName) => {
    const response = await api.get('/api/dish', { params: { name: dishName } });
    return response.data;
  },
};

export const configApi = {
  /**
   * Get current config
   * @returns {Promise<{hasApiKey: boolean, model: string, tenantId: string}>}
   */
  getConfig: async () => {
    const response = await api.get('/api/config');
    return response.data;
  },

  /**
   * Save config
   * @param {object} config - Config object
   * @returns {Promise<{success: boolean}>}
   */
  saveConfig: async (config) => {
    const response = await api.post('/api/config', config);
    return response.data;
  },

  /**
   * Get tenant info
   * @returns {Promise<{id: string, branding: object}>}
   */
  getTenant: async () => {
    const response = await api.get('/api/tenant');
    return response.data;
  },

  /**
   * Get available MCP tools
   * @returns {Promise<array>}
   */
  getTools: async () => {
    const response = await api.get('/api/tools');
    return response.data;
  },
};

// ============================================
// Admin API
// ============================================

export const adminApi = {
  // Auth
  login: async (email, password, tenantSlug = 'default') => {
    const response = await api.post('/api/admin/login', {
      email,
      password,
      tenant_slug: tenantSlug,
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/admin/logout');
    return response.data;
  },

  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/api/admin/dashboard');
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await api.get('/api/admin/categories');
    return response.data;
  },

  createCategory: async (data) => {
    const response = await api.post('/api/admin/categories', data);
    return response.data;
  },

  updateCategory: async (id, data) => {
    const response = await api.put(`/api/admin/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/api/admin/categories/${id}`);
    return response.data;
  },

  // Dishes
  getDishes: async () => {
    const response = await api.get('/api/admin/dishes');
    return response.data;
  },

  createDish: async (formData) => {
    const response = await api.post('/api/admin/dishes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateDish: async (id, formData) => {
    const response = await api.put(`/api/admin/dishes/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteDish: async (id) => {
    const response = await api.delete(`/api/admin/dishes/${id}`);
    return response.data;
  },

  // Ingredients
  getIngredients: async () => {
    const response = await api.get('/api/admin/ingredients');
    return response.data;
  },

  createIngredient: async (data) => {
    const response = await api.post('/api/admin/ingredients', data);
    return response.data;
  },

  updateIngredient: async (id, data) => {
    const response = await api.put(`/api/admin/ingredients/${id}`, data);
    return response.data;
  },

  deleteIngredient: async (id) => {
    const response = await api.delete(`/api/admin/ingredients/${id}`);
    return response.data;
  },

  // Settings
  getSettings: async () => {
    const response = await api.get('/api/admin/settings');
    return response.data;
  },

  updateSettings: async (data) => {
    const response = await api.put('/api/admin/settings', data);
    return response.data;
  },

  // Export
  exportMenu: async () => {
    const response = await api.get('/api/admin/export');
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (page = 1, limit = 50) => {
    const response = await api.get('/api/admin/audit-logs', {
      params: { page, limit },
    });
    return response.data;
  },
};

export default api;
