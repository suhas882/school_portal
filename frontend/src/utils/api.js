const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to retrieve token from local storage
export function getToken() {
  return localStorage.getItem('school_jwt_token');
}

// Helper to retrieve user profile from local storage
export function getUser() {
  try {
    const userStr = localStorage.getItem('school_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

// Request Wrapper
async function makeRequest(endpoint, method = 'GET', body = null, isMultipart = false) {
  const token = getToken();
  const headers = {};

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    if (isMultipart) {
      config.body = body; // let browser set content-type boundary
    } else {
      config.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401 || response.status === 403) {
    // Session expired or unauthorized, automatically logout
    localStorage.removeItem('school_jwt_token');
    localStorage.removeItem('school_user');
    if (!endpoint.includes('/auth/')) {
      window.dispatchEvent(new Event('auth-expired'));
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// Central API Endpoints Export
export const api = {
  // Authentication
  auth: {
    loginAdmin: async (username, password) => {
      const data = await makeRequest('/auth/admin/login', 'POST', { username, password });
      localStorage.setItem('school_jwt_token', data.token);
      localStorage.setItem('school_user', JSON.stringify(data.user));
      return data.user;
    },
    loginParent: async (username, password) => {
      const data = await makeRequest('/auth/parent/login', 'POST', { username, password });
      localStorage.setItem('school_jwt_token', data.token);
      localStorage.setItem('school_user', JSON.stringify(data.user));
      return data.user;
    },
    logout: () => {
      localStorage.removeItem('school_jwt_token');
      localStorage.removeItem('school_user');
    },
    changePassword: (currentPassword, newPassword) => {
      return makeRequest('/auth/change-password', 'POST', { currentPassword, newPassword });
    },
    getPublicSchoolInfo: () => {
      return makeRequest('/auth/school-info');
    }
  },

  // Stats
  admin: {
    getStats: () => makeRequest('/admin/stats'),
    getSchoolInfo: () => makeRequest('/admin/school-info'),
    updateSchoolInfo: (info) => makeRequest('/admin/school-info', 'PUT', info),
    getActivityLogs: () => makeRequest('/admin/activity-logs'),
  },

  // Classes
  classes: {
    list: () => makeRequest('/admin/classes'),
    create: (classData) => makeRequest('/admin/classes', 'POST', classData),
    update: (id, classData) => makeRequest(`/admin/classes/${id}`, 'PUT', classData),
    updateFees: (id, feeData) => makeRequest(`/admin/classes/${id}/fees`, 'PUT', feeData),
    delete: (id) => makeRequest(`/admin/classes/${id}`, 'DELETE')
  },

  // Sections
  sections: {
    list: () => makeRequest('/admin/sections'),
    listByClass: (classId) => makeRequest(`/admin/sections/by-class/${classId}`),
    create: (name, class_id) => makeRequest('/admin/sections', 'POST', { name, class_id }),
    delete: (id) => makeRequest(`/admin/sections/${id}`, 'DELETE')
  },

  // Subjects
  subjects: {
    list: () => makeRequest('/admin/subjects'),
    listByClass: (classId) => makeRequest(`/admin/subjects/by-class/${classId}`),
    create: (name, class_id) => makeRequest('/admin/subjects', 'POST', { name, class_id }),
    delete: (id) => makeRequest(`/admin/subjects/${id}`, 'DELETE')
  },

  // Students
  students: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return makeRequest(`/admin/students?${query}`);
    },
    create: (student) => makeRequest('/admin/students', 'POST', student),
    update: (id, student) => makeRequest(`/admin/students/${id}`, 'PUT', student),
    delete: (id) => makeRequest(`/admin/students/${id}`, 'DELETE')
  },

  // Parents Management
  parents: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return makeRequest(`/admin/parents?${query}`);
    },
    create: (parent) => makeRequest('/admin/parents', 'POST', parent),
    update: (id, parent) => makeRequest(`/admin/parents/${id}`, 'PUT', parent),
    delete: (id) => makeRequest(`/admin/parents/${id}`, 'DELETE'),
    resetPassword: (id, newPassword) => makeRequest(`/admin/parents/${id}/reset-password`, 'POST', { newPassword }),
    getParentProfile: () => makeRequest('/auth/parent/profile'),
    getChildPayments: (studentId) => makeRequest(`/auth/parent/students/${studentId}/payments`)
  },

  // Notices
  notices: {
    list: () => makeRequest('/auth/notices'),
    create: (notice) => makeRequest('/admin/notices', 'POST', notice),
    update: (id, notice) => makeRequest(`/admin/notices/${id}`, 'PUT', notice),
    delete: (id) => makeRequest(`/admin/notices/${id}`, 'DELETE')
  },

  // Homework (includes Multer Multipart files payload)
  homework: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return makeRequest(`/homework?${query}`);
    },
    get: (id) => makeRequest(`/homework/${id}`),
    create: (formData) => makeRequest('/homework', 'POST', formData, true),
    update: (id, formData) => makeRequest(`/homework/${id}`, 'PUT', formData, true),
    delete: (id) => makeRequest(`/homework/${id}`, 'DELETE')
  },

  // School Expenses
  expenses: {
    list: () => makeRequest('/admin/expenses'),
    create: (expense) => makeRequest('/admin/expenses', 'POST', expense),
    delete: (id) => makeRequest(`/admin/expenses/${id}`, 'DELETE')
  },

  // Student Payments
  payments: {
    listByStudent: (studentId) => makeRequest(`/admin/students/${studentId}/payments`),
    create: (studentId, amount, date) => makeRequest(`/admin/students/${studentId}/payments`, 'POST', { amount, date })
  },

  // System Database Backups
  system: {
    listBackups: () => makeRequest('/system/backups'),
    createBackup: () => makeRequest('/system/backup', 'POST'),
    restoreBackup: (filename) => makeRequest('/system/restore', 'POST', { filename }),
    deleteBackup: (filename) => makeRequest(`/system/backups/${filename}`, 'DELETE')
  }
};
