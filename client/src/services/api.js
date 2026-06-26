import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach bearer token from localStorage on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Return response.data directly; handle auth expiry globally.
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Avoid redirect loop if already on login.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Extract a human-friendly error message from an axios error.
export function getErrorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first)) return first[0];
    if (typeof first === 'string') return first;
  }
  return err?.message || fallback;
}

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  assign: (id, data) => api.put(`/leads/${id}/assign`, data),
  bulkImport: (data) => api.post('/leads/bulk-import', data),
  getStats: () => api.get('/leads/stats'),
};

export const activitiesAPI = {
  create: (data) => api.post('/activities', data),
  getByLead: (leadId, params) => api.get(`/activities/lead/${leadId}`, { params }),
  getMine: (params) => api.get('/activities/me', { params }),
  getAll: (params) => api.get('/activities', { params }),
  delete: (id) => api.delete(`/activities/${id}`),
};

export const followUpsAPI = {
  create: (data) => api.post('/followups', data),
  getByLead: (leadId, params) => api.get(`/followups/lead/${leadId}`, { params }),
  getMine: (params) => api.get('/followups/me', { params }),
  getAll: (params) => api.get('/followups', { params }),
  markDone: (id) => api.put(`/followups/${id}/done`),
  update: (id, data) => api.put(`/followups/${id}`, data),
  delete: (id) => api.delete(`/followups/${id}`),
};

export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getDailyReport: (params) => api.get('/admin/reports/daily', { params }),
  getWeeklyReport: (params) => api.get('/admin/reports/weekly', { params }),
  getMonthlyReport: (params) => api.get('/admin/reports/monthly', { params }),
  getPipeline: () => api.get('/admin/reports/pipeline'),
  getFollowUpReport: () => api.get('/admin/reports/followups'),
  getTeamPerformance: (params) => api.get('/admin/team', { params }),
  getSources: (params) => api.get('/admin/sources', { params }),
  getRecentActivity: (params) => api.get('/admin/activity/recent', { params }),
};

export const employeesAPI = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  getPerformance: (id, params) => api.get(`/employees/${id}/performance`, { params }),
};

export const pipelineAPI = {
  run: () => api.post('/pipeline/run'),
  getStatus: () => api.get('/pipeline/status'),
  getUsage: () => api.get('/pipeline/usage'),
};

export const aiAPI = {
  analyze: (id) => api.post(`/ai/analyze/${id}`),
  batchAnalyze: (leadIds) => api.post('/ai/batch-analyze', { leadIds }),
  discuss: (id) => api.post(`/ai/discuss/${id}`),
  status: () => api.get('/ai/status'),
};

export default api;
