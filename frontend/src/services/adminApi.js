import i18n, { getActiveLanguage } from '../i18n';
import { getStoredToken } from './api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function extractAdminError(data, statusCode) {
  const fallback = i18n.t('errors:httpFallback', { status: statusCode });
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (
    data.detail &&
    typeof data.detail === 'object' &&
    typeof data.detail.detail === 'string'
  ) {
    return data.detail.detail;
  }
  if (Array.isArray(data.detail)) return data.detail.join(' ');
  if (Array.isArray(data.non_field_errors)) {
    return data.non_field_errors.join(' ');
  }
  if (typeof data === 'object') {
    for (const val of Object.values(data)) {
      if (typeof val === 'string' && val) return val;
      if (Array.isArray(val) && val.length > 0) return val.join(' ');
    }
  }
  return fallback;
}

async function adminRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'Accept-Language': getActiveLanguage(),
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(extractAdminError(data, response.status));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

/* ==================== Public System Config ==================== */

export function fetchPublicSystemConfig() {
  return adminRequest('/system/public-config/', { method: 'GET' });
}

/* ==================== Admin System Appearance ==================== */

export function fetchAdminAppearance() {
  return adminRequest('/admin/appearance/', { method: 'GET' });
}

export function updateAdminAppearance(data) {
  return adminRequest('/admin/appearance/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/* ==================== Admin Overview & Audit Logs ==================== */

export function fetchAdminOverview() {
  return adminRequest('/admin/overview/', { method: 'GET' });
}

export function fetchAdminAuditLogs(params = {}) {
  return adminRequest(`/admin/audit-logs/${buildQuery(params)}`, {
    method: 'GET',
  });
}

/* ==================== Admin Users & Roles ==================== */

export function fetchAdminUsers(params = {}) {
  return adminRequest(`/admin/users/${buildQuery(params)}`, { method: 'GET' });
}

export function createAdminUser(data) {
  return adminRequest('/admin/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAdminUser(id, data) {
  return adminRequest(`/admin/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function toggleAdminUserActive(id) {
  return adminRequest(`/admin/users/${id}/toggle-active/`, {
    method: 'POST',
  });
}

export function resetAdminUserPassword(id, password) {
  return adminRequest(`/admin/users/${id}/reset-password/`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function deleteAdminUser(id) {
  return adminRequest(`/admin/users/${id}/`, { method: 'DELETE' });
}

export function fetchAdminRoles() {
  return adminRequest('/admin/roles/', { method: 'GET' });
}

export function createAdminRole(data) {
  return adminRequest('/admin/roles/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAdminRole(id, data) {
  return adminRequest(`/admin/roles/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAdminRole(id) {
  return adminRequest(`/admin/roles/${id}/`, { method: 'DELETE' });
}

/* ==================== Admin Modules ==================== */

export function fetchAdminModules() {
  return adminRequest('/admin/modules/', { method: 'GET' });
}

export function updateAdminModule(key, data) {
  return adminRequest(`/admin/modules/${encodeURIComponent(key)}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/* ==================== Admin Content (Courses / Cards / Videos) ==================== */

export function fetchAdminCourses(params = {}) {
  return adminRequest(`/admin/courses/${buildQuery(params)}`, {
    method: 'GET',
  });
}

export function createAdminCourse(data) {
  return adminRequest('/admin/courses/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAdminCourse(id, data) {
  return adminRequest(`/admin/courses/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAdminCourse(id) {
  return adminRequest(`/admin/courses/${id}/`, { method: 'DELETE' });
}

export function fetchAdminCards(params = {}) {
  return adminRequest(`/admin/cards/${buildQuery(params)}`, { method: 'GET' });
}

export function createAdminCard(data) {
  return adminRequest('/admin/cards/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAdminCard(id, data) {
  return adminRequest(`/admin/cards/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAdminCard(id) {
  return adminRequest(`/admin/cards/${id}/`, { method: 'DELETE' });
}

export function fetchAdminVideos(params = {}) {
  return adminRequest(`/admin/shadowing-videos/${buildQuery(params)}`, {
    method: 'GET',
  });
}

export function fetchAdminVideoDetail(id) {
  return adminRequest(`/admin/shadowing-videos/${id}/`, { method: 'GET' });
}

export function createAdminVideo(data) {
  const isFormData = data instanceof FormData;
  return adminRequest('/admin/shadowing-videos/', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  });
}

export function updateAdminVideo(id, data) {
  const isFormData = data instanceof FormData;
  return adminRequest(`/admin/shadowing-videos/${id}/`, {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  });
}

export function deleteAdminVideo(id) {
  return adminRequest(`/admin/shadowing-videos/${id}/`, {
    method: 'DELETE',
  });
}
