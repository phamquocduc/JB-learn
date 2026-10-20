const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'jb_auth_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
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

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let errorMessage = `Yêu cầu thất bại với mã lỗi ${response.status}`;
    if (data) {
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.non_field_errors)) {
        errorMessage = data.non_field_errors.join(' ');
      } else if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        if (Array.isArray(val)) {
          errorMessage = val.join(' ');
        } else if (typeof val === 'string') {
          errorMessage = val;
        }
      }
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/* ==================== Auth APIs ==================== */

export async function login({ username, password }) {
  const data = await request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data?.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function register({ username, email, password }) {
  const data = await request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  if (data?.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function logout() {
  try {
    await request('/auth/logout/', {
      method: 'POST',
    });
  } finally {
    clearStoredToken();
  }
}

export async function fetchCurrentUser() {
  return request('/auth/me/', {
    method: 'GET',
  });
}

/* ==================== Courses APIs ==================== */

export async function fetchCourses(params = {}) {
  const query = new URLSearchParams();
  if (params.level) query.append('level', params.level);
  if (params.card_type) query.append('card_type', params.card_type);
  if (params.search) query.append('search', params.search);
  if (params.mine) query.append('mine', 'true');

  const queryString = query.toString();
  return request(`/courses/${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
}

export async function createCourse(data) {
  return request('/courses/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCourse(id, data) {
  return request(`/courses/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCourse(id) {
  return request(`/courses/${id}/`, {
    method: 'DELETE',
  });
}

/* ==================== Cards APIs ==================== */

export async function fetchCards(params = {}) {
  const query = new URLSearchParams();
  if (params.type) query.append('type', params.type);
  if (params.level) query.append('level', params.level);
  if (params.lesson) query.append('lesson', params.lesson);
  if (params.course) query.append('course', params.course);
  if (params.search) query.append('search', params.search);
  if (params.mine) query.append('mine', 'true');

  const queryString = query.toString();
  return request(`/cards/${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
}

export async function createCard(data) {
  return request('/cards/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCard(id, data) {
  return request(`/cards/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCard(id) {
  return request(`/cards/${id}/`, {
    method: 'DELETE',
  });
}
