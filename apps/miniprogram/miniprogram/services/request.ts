import { getApiEnvironment, getCurrentEnvVersion, isForbiddenProductionApiBaseUrl } from '../config/env';
import { RequestError, type ApiResponse, type RequestOptions } from '../types/api';
import {
  buildAuthorizationHeader,
  clearAuthSession,
  getRefreshToken,
  setAccessToken,
} from './auth-session';
import { API_ENDPOINTS } from './endpoints';

const responseCache = new Map<string, { value: unknown; expiresAt: number }>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const getInFlightRequests = new Map<string, Promise<unknown>>();
const staleResponseCache = new Map<
  string,
  { value: unknown; expiresAt: number; staleUntil: number }
>();
const staleRefreshRequests = new Map<string, Promise<unknown>>();
let tokenRefreshPromise: Promise<boolean> | null = null;

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * 微信小程序会把 JS 的 undefined 序列化成查询字符串 "undefined"，
 * 服务端会把 featured=undefined 当成非法布尔值并返回 400。发送前去掉空值。
 */
function compactRequestData(
  data: WechatMiniprogram.IAnyObject | string | ArrayBuffer | undefined,
): WechatMiniprogram.IAnyObject | string | ArrayBuffer | undefined {
  if (!data || typeof data !== 'object' || data instanceof ArrayBuffer) {
    return data;
  }
  const compact: WechatMiniprogram.IAnyObject = {};
  Object.entries(data as WechatMiniprogram.IAnyObject).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
        return;
      }
      compact[key] = trimmed;
      return;
    }
    compact[key] = value;
  });
  return compact;
}

function buildHeader(customHeader?: Record<string, string>, auth = true): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(auth ? buildAuthorizationHeader() : {}),
    ...customHeader,
  };
}

function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorMessage(raw: unknown, fallback: string): string {
  if (!isRecord(raw)) {
    return fallback;
  }
  if (typeof raw.message === 'string' && raw.message.trim()) {
    return raw.message;
  }
  if (typeof raw.msg === 'string' && raw.msg.trim()) {
    return raw.msg;
  }
  return fallback;
}

function readErrorCode(raw: unknown): string | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  if (typeof raw.code === 'string' && raw.code) {
    return raw.code;
  }
  if (typeof raw.code === 'number' && Number.isFinite(raw.code)) {
    return String(raw.code);
  }
  if (isRecord(raw.error) && typeof raw.error.code === 'string') {
    return raw.error.code;
  }
  return undefined;
}

function unwrapResponse<T>(statusCode: number, raw: unknown): T {
  if (!isRecord(raw)) {
    throw new RequestError('响应格式无效', statusCode, raw);
  }
  if (typeof raw.success === 'boolean') {
    const payload = raw as unknown as ApiResponse<T>;
    if (!payload.success) {
      throw new RequestError(
        payload.message || readErrorMessage(raw, `请求失败（HTTP ${statusCode}）`),
        statusCode,
        payload,
        payload.error?.code || readErrorCode(raw),
      );
    }
    return payload.data;
  }
  if (typeof raw.code === 'string') {
    if (raw.code === 'OK') {
      return raw.data as T;
    }
    throw new RequestError(
      readErrorMessage(raw, `请求失败（HTTP ${statusCode}）`),
      statusCode,
      raw,
      raw.code,
    );
  }
  if (typeof raw.code === 'number') {
    throw new RequestError(
      readErrorMessage(raw, `请求失败（HTTP ${statusCode}）`),
      statusCode,
      raw,
      String(raw.code),
    );
  }
  throw new RequestError('响应格式无效', statusCode, raw);
}

export function refreshAccessToken(): Promise<boolean> {
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  const refresh = getRefreshToken();
  if (!refresh) {
    return Promise.resolve(false);
  }
  const env = getApiEnvironment();
  const current = new Promise<boolean>((resolve) => {
    wx.request({
      url: joinUrl(env.apiBaseUrl, API_ENDPOINTS.authRefresh),
      method: 'POST',
      data: { refresh },
      header: { 'Content-Type': 'application/json' },
      timeout: env.timeout,
      success(res) {
        try {
          const data = unwrapResponse<{ access: string }>(res.statusCode, res.data);
          setAccessToken(data.access);
          resolve(true);
        } catch {
          clearAuthSession();
          resolve(false);
        }
      },
      fail() {
        clearAuthSession();
        resolve(false);
      },
    });
  });
  tokenRefreshPromise = current;
  const clearPending = () => {
    if (tokenRefreshPromise === current) {
      tokenRefreshPromise = null;
    }
  };
  void current.then(clearPending, clearPending);
  return current;
}

function executeRequest<T>(options: RequestOptions, retried: boolean): Promise<T> {
  const env = getApiEnvironment();
  const version = getCurrentEnvVersion();
  if (isForbiddenProductionApiBaseUrl(version, env.apiBaseUrl)) {
    const message =
      `当前 ${version} 环境尚未配置有效的正式 API 地址，请先在环境配置中填写 HTTPS API 域名。` +
      `（当前值: ${env.apiBaseUrl || '（空）'}）`;
    console.error('[api]', message);
    return Promise.reject(new RequestError(message));
  }
  const { url, method = 'GET', header, timeout = env.timeout, auth = true } = options;
  const data = compactRequestData(options.data);
  const fullUrl = joinUrl(env.apiBaseUrl, url);

  return new Promise<T>((resolve, reject) => {
    if (env.enableDebugLog) {
      console.log('[api]', method, fullUrl, data ?? '');
    }
    wx.request({
      url: fullUrl,
      method: method as WechatMiniprogram.RequestOption['method'],
      data,
      header: buildHeader(header, auth),
      timeout,
      success(res) {
        try {
          if (!isSuccessStatus(res.statusCode)) {
            const raw = res.data;
            const message = readErrorMessage(raw, `请求失败（HTTP ${res.statusCode}）`);
            const code = readErrorCode(raw);
            if (!retried && (res.statusCode === 401 || code === 'TOKEN_EXPIRED')) {
              void refreshAccessToken().then((refreshed) => {
                if (refreshed) {
                  executeRequest<T>(options, true).then(resolve, reject);
                  return;
                }
                clearAuthSession();
                reject(new RequestError(message, res.statusCode, res.data, code));
              });
              return;
            }
            if (res.statusCode === 401 || code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED') {
              clearAuthSession();
            }
            reject(new RequestError(message, res.statusCode, res.data, code));
            return;
          }
          resolve(unwrapResponse<T>(res.statusCode, res.data));
        } catch (error) {
          reject(error instanceof RequestError ? error : new RequestError('响应解析失败', res.statusCode, res.data));
        }
      },
      fail(err) {
        const raw = err.errMsg || '网络请求失败';
        const message = /timeout|timed out|超时/i.test(raw) ? '加载超时，请检查网络或稍后重试' : raw;
        reject(new RequestError(message));
      },
    });
  });
}

export function request<T>(options: RequestOptions): Promise<T> {
  return executeRequest<T>(options, false);
}

export function get<T>(
  url: string,
  data?: RequestOptions['data'],
  header?: Record<string, string>,
  timeout?: number,
): Promise<T> {
  const env = getApiEnvironment();
  const compactData = compactRequestData(data);
  const key = JSON.stringify([
    env.apiBaseUrl,
    url,
    compactData ?? null,
    buildHeader(header),
    timeout ?? env.timeout,
  ]);
  const pending = getInFlightRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }
  const current = request<T>({
    url,
    method: 'GET',
    data: compactData,
    header,
    timeout,
  });
  getInFlightRequests.set(key, current);
  const clearPending = () => {
    if (getInFlightRequests.get(key) === current) {
      getInFlightRequests.delete(key);
    }
  };
  void current.then(clearPending, clearPending);
  return current;
}

export async function withRequestCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }
  if (cached) {
    responseCache.delete(key);
  }
  const pending = inFlightRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }
  const requestPromise = (async () => {
    try {
      const value = await loader();
      responseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inFlightRequests.delete(key);
    }
  })();
  inFlightRequests.set(key, requestPromise);
  return requestPromise;
}

/**
 * Fresh 期间直接返回；进入 stale 窗口后立即返回旧值并在后台刷新。
 * 首次加载或超过 stale 窗口时仍等待请求，避免无限展示过期数据。
 */
/** 用磁盘或预取结果预热内存 SWR（savedAt 为上次成功写入时间） */
export function primeStaleWhileRevalidateCache<T>(
  key: string,
  value: T,
  freshTtlMs: number,
  staleTtlMs: number,
  savedAt: number,
): void {
  staleResponseCache.set(key, {
    value,
    expiresAt: savedAt + freshTtlMs,
    staleUntil: savedAt + freshTtlMs + staleTtlMs,
  });
}

export function hasStaleWhileRevalidateCache(key: string): boolean {
  return staleResponseCache.has(key);
}

export async function withStaleWhileRevalidate<T>(
  key: string,
  freshTtlMs: number,
  staleTtlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = staleResponseCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const refresh = () => {
    const pending = staleRefreshRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }
    const current = (async () => {
      try {
        const value = await loader();
        const refreshedAt = Date.now();
        staleResponseCache.set(key, {
          value,
          expiresAt: refreshedAt + freshTtlMs,
          staleUntil: refreshedAt + freshTtlMs + staleTtlMs,
        });
        return value;
      } finally {
        staleRefreshRequests.delete(key);
      }
    })();
    staleRefreshRequests.set(key, current);
    return current;
  };

  if (cached && cached.staleUntil > now) {
    void refresh().catch(() => {
      // 后台刷新失败时继续使用仍在 stale 窗口内的数据。
    });
    return cached.value as T;
  }
  if (cached) {
    staleResponseCache.delete(key);
  }
  return refresh();
}

export function invalidateRequestCache(prefix?: string): void {
  if (!prefix) {
    responseCache.clear();
    staleResponseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
    }
  }
  for (const key of staleResponseCache.keys()) {
    if (key.startsWith(prefix)) {
      staleResponseCache.delete(key);
    }
  }
}

export function post<T>(
  url: string,
  data?: RequestOptions['data'],
  header?: Record<string, string>,
  options?: Pick<RequestOptions, 'auth' | 'timeout'>,
) {
  return request<T>({ url, method: 'POST', data, header, ...options });
}

export function put<T>(url: string, data?: RequestOptions['data'], header?: Record<string, string>) {
  return request<T>({ url, method: 'PUT', data, header });
}

export function patch<T>(
  url: string,
  data?: RequestOptions['data'],
  header?: Record<string, string>,
) {
  return request<T>({ url, method: 'PATCH', data, header });
}

export function del<T>(url: string, data?: RequestOptions['data'], header?: Record<string, string>) {
  return request<T>({ url, method: 'DELETE', data, header });
}
