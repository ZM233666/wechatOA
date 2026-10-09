const ACCESS_TOKEN_STORAGE_KEY = 'mini_access_token';

/** 正式后端 JWT（Django /api/token/ 等）；Mock 开发期通常不需要 */
export function getAccessToken(): string {
  try {
    return String(wx.getStorageSync(ACCESS_TOKEN_STORAGE_KEY) || '').trim();
  } catch {
    return '';
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

export function clearAccessToken(): void {
  try {
    wx.removeStorageSync(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function buildAuthorizationHeader(): Record<string, string> {
  const token = getAccessToken();
  if (!token) {
    return {};
  }
  return { Authorization: `JWT ${token}` };
}
