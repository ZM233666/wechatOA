import { RequestError } from '../types/api';
import {
  clearAuthSession,
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  setTempBindToken,
} from './auth-session';
import { API_ENDPOINTS } from './endpoints';
import { post } from './request';

/** 微信 login code 有效期约 5 分钟，会话内复用以减少 wx.login 次数 */
const LOGIN_CODE_TTL_MS = 4 * 60 * 1000;

let cachedLoginCode = '';
let cachedLoginCodeAt = 0;

function fetchWxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        const code = res.code?.trim();
        if (code) {
          resolve(code);
          return;
        }
        reject(new RequestError('微信登录失败，请重试'));
      },
      fail() {
        reject(new RequestError('微信登录失败，请重试'));
      },
    });
  });
}

/** 会话内复用 loginCode；启动身份同步与受保护 Mini API 共用 */
export async function getSessionLoginCode(): Promise<string> {
  const now = Date.now();
  if (cachedLoginCode && now - cachedLoginCodeAt < LOGIN_CODE_TTL_MS) {
    return cachedLoginCode;
  }
  const code = await fetchWxLoginCode();
  cachedLoginCode = code;
  cachedLoginCodeAt = now;
  return code;
}

export function invalidateSessionLoginCode(): void {
  cachedLoginCode = '';
  cachedLoginCodeAt = 0;
}

type MiniSession = {
  access: string;
  refresh: string;
  expiresIn: number;
  email: string;
  identityType: string;
  company: Record<string, unknown> | null;
};

function extractTempToken(error: RequestError): string {
  const raw = error.responseData;
  if (!raw || typeof raw !== 'object') {
    return '';
  }
  const data = (raw as { data?: unknown }).data;
  if (!data || typeof data !== 'object') {
    return '';
  }
  return String((data as { tempToken?: unknown }).tempToken || '').trim();
}

/**
 * 用一次性 wx.login code 换取 Mini JWT。code 交换后立即失效本地缓存，
 * 后续重新登录会获取新 code，不再把 code 当运行时身份参数。
 */
export async function loginMiniSession(): Promise<MiniSession | null> {
  const code = await getSessionLoginCode();
  try {
    const session = await post<MiniSession>(API_ENDPOINTS.authWxLogin, { code });
    setAccessToken(session.access);
    setRefreshToken(session.refresh);
    setTempBindToken('');
    return session;
  } catch (error) {
    if (error instanceof RequestError && error.code === 'NEED_BIND') {
      clearAuthSession();
      setTempBindToken(extractTempToken(error));
      return null;
    }
    throw error;
  } finally {
    invalidateSessionLoginCode();
  }
}

export async function ensureMiniSession(): Promise<boolean> {
  if (getAccessToken()) {
    return true;
  }
  return Boolean(await loginMiniSession());
}
