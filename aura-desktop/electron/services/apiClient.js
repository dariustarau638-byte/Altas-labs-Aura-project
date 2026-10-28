import { getAuthToken, saveSession, clearSession } from './tokenStorage.js';

let API_BASE_URL = process.env.ATLAS_API_URL || 'http://localhost:4000';

export function setApiBaseUrl(url) {
  API_BASE_URL = url.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

/**
 * Fetch wrapper interceptor that automatically attaches Bearer JWT authorization.
 */
export async function fetchWithAuth(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If token is invalid or expired, notify or clear session
    const errorJson = await response.json().catch(() => ({}));
    if (errorJson.error && /token/i.test(errorJson.error)) {
      console.warn('[apiClient] 401 Unauthorized received, token may be expired.');
    }
    const err = new Error(errorJson.error || 'Unauthorized: Token expired or invalid');
    err.status = 401;
    err.data = errorJson;
    throw err;
  }

  if (response.status === 403) {
    const errorJson = await response.json().catch(() => ({}));
    if (errorJson.upgradeRequired) {
      try {
        const electron = await import('electron');
        const BrowserWindow = electron.BrowserWindow || electron.default?.BrowserWindow;
        if (BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
          BrowserWindow.getAllWindows().forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send('aura:upgrade-alert', errorJson);
            }
          });
        }
      } catch {}
    }
    const err = new Error(errorJson.error || 'Forbidden: Tier limit reached');
    err.status = 403;
    err.data = errorJson;
    throw err;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `HTTP error ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const apiClient = {
  getApiBaseUrl,
  setApiBaseUrl,

  async signup(email, password, subscription_status = 'free') {
    const res = await fetchWithAuth('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, subscription_status }),
    });
    if (res.token) {
      saveSession(res.token, res.user);
    }
    return res;
  },

  async login(email, password) {
    const res = await fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      saveSession(res.token, res.user);
    }
    return res;
  },

  async logout() {
    clearSession();
    return { success: true };
  },

  async trackUsage(action_performed, tokens_used_or_duration = 1, metadata = {}) {
    return fetchWithAuth('/api/usage/track', {
      method: 'POST',
      body: JSON.stringify({
        action_performed,
        tokens_used_or_duration,
        platform: 'desktop',
        metadata,
      }),
    });
  },

  async getDashboard() {
    return fetchWithAuth('/api/user/dashboard', {
      method: 'GET',
    });
  },

  async getTier() {
    return fetchWithAuth('/api/user/tier', {
      method: 'GET',
    });
  },

  async checkTier(feature) {
    return fetchWithAuth('/api/tier/check', {
      method: 'POST',
      body: JSON.stringify({ feature }),
    });
  },
};
