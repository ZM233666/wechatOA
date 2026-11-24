const ACCESS_TOKEN_STORAGE_KEY = 'mini_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'mini_refresh_token';
const TEMP_BIND_TOKEN_STORAGE_KEY = 'mini_temp_bind_token';

export function getAccessToken(): string {
  try {
    return String(wx.getStorageSync(ACCESS_TOKEN_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

function getStoredToken(key: string): string {
  try {
    return String(wx.getStorageSync(key) || '').trim();
  } catch {
    return '';
  }
}

function setStoredToken(key: string, token: string): void {
  const value = token.trim();
  try {
    if (value) {
      wx.setStorageSync(key, value);
    } else {
      wx.removeStorageSync(key);
    }
  } catch {
    // ignore storage errors
  }
}

export function setAccessToken(token: string): void {
  const value = token.trim();
  if (!value) {
    clearAccessToken();
    return;
  }
  try {
    wx.setStorageSync(ACCESS_TOKEN_STORAGE_KEY, value);
  } catch {
    // ignore storage errors
  }
}

export function getRefreshToken(): string {
  return getStoredToken(REFRESH_TOKEN_STORAGE_KEY);
}

export function setRefreshToken(token: string): void {
  setStoredToken(REFRESH_TOKEN_STORAGE_KEY, token);
}

export function getTempBindToken(): string {
  return getStoredToken(TEMP_BIND_TOKEN_STORAGE_KEY);
}

export function setTempBindToken(token: string): void {
  setStoredToken(TEMP_BIND_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  try {
    wx.removeStorageSync(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function clearAuthSession(): void {
  clearAccessToken();
  setRefreshToken('');
  setTempBindToken('');
}

export function buildAuthorizationHeader(): Record<string, string> {
  const token = getAccessToken();
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}
