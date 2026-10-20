import { getStoredToken } from './api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function extractErrorMessage(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val
      .map((item) => extractErrorMessage(item))
      .filter(Boolean)
      .join(' ');
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => {
        const msg = extractErrorMessage(v);
        return msg ? `${k}: ${msg}` : '';
      })
      .filter(Boolean)
      .join('; ');
  }
  return String(val);
}

async function request(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
      if (typeof data.error === 'string') {
        errorMessage = data.error;
      } else if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.non_field_errors)) {
        errorMessage = data.non_field_errors.join(' ');
      } else {
        const extracted = extractErrorMessage(data);
        if (extracted) {
          errorMessage = extracted;
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

export async function fetchShadowingVideos(params = {}) {
  const query = new URLSearchParams();
  if (params.topic) query.append('topic', params.topic);
  if (params.level) query.append('level', params.level);
  if (params.media_source) query.append('media_source', params.media_source);
  if (params.mine) query.append('mine', 'true');
  if (params.search) query.append('search', params.search);

  const queryString = query.toString();
  return request(`/shadowing/videos/${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
}

export async function fetchShadowingVideo(id) {
  return request(`/shadowing/videos/${id}/`, {
    method: 'GET',
  });
}

export async function createShadowingVideo(data) {
  const isFormData = data instanceof FormData;
  return request('/shadowing/videos/', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  });
}

export async function updateShadowingVideo(id, data) {
  const isFormData = data instanceof FormData;
  return request(`/shadowing/videos/${id}/`, {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  });
}

export async function deleteShadowingVideo(id) {
  return request(`/shadowing/videos/${id}/`, {
    method: 'DELETE',
  });
}

export async function fetchShadowingTopics() {
  return request('/shadowing/topics/', {
    method: 'GET',
  });
}

export async function extractTranscript(data) {
  const isFormData = data instanceof FormData;
  return request('/shadowing/videos/extract_transcript/', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  });
}

export async function fetchVideoProgress(id) {
  return request(`/shadowing/videos/${id}/progress/`, {
    method: 'GET',
  });
}

export async function updateVideoProgress(id, payload) {
  return request(`/shadowing/videos/${id}/progress/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
