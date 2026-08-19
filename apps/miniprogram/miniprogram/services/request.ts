import { getApiEnvironment, getCurrentEnvVersion, isForbiddenProductionApiBaseUrl } from '../config/env';
import { RequestError, type ApiResponse, type RequestOptions } from '../types/api';

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function buildHeader(customHeader?: Record<string, string>): Record<string, string> {
  const env = getApiEnvironment();
  const version = getCurrentEnvVersion();
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeader,
  };
  // Mock-only：trial/release 禁止附加 X-Mock-Scenario。
  if (version !== 'develop') {
    delete header['X-Mock-Scenario'];
    delete header['x-mock-scenario'];
  }
  if (version === 'develop' && env.dataSource === 'mock-server' && env.mockScenario) {
    header['X-Mock-Scenario'] = env.mockScenario;
  }
  return header;
}

function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unwrapResponse<T>(statusCode: number, raw: unknown): T {
  if (!isRecord(raw) || typeof raw.success !== 'boolean') {
    throw new RequestError('响应格式无效', statusCode, raw);
  }
  const payload = raw as unknown as ApiResponse<T>;
  if (!payload.success) {
    throw new RequestError(
      payload.message || `请求失败（HTTP ${statusCode}）`,
      statusCode,
      payload,
      payload.error?.code,
    );
  }
  return payload.data;
}

export function request<T>(options: RequestOptions): Promise<T> {
  const env = getApiEnvironment();
  const version = getCurrentEnvVersion();
  if (isForbiddenProductionApiBaseUrl(version, env.apiBaseUrl)) {
    const message =
      `当前 ${version} 环境尚未配置有效的正式 API 地址，请先在环境配置中填写 HTTPS API 域名。` +
      `（当前值: ${env.apiBaseUrl || '（空）'}）`;
    console.error('[api]', message);
    return Promise.reject(new RequestError(message));
  }
  const { url, method = 'GET', data, header, timeout = env.timeout } = options;
  const fullUrl = joinUrl(env.apiBaseUrl, url);

  return new Promise<T>((resolve, reject) => {
    if (env.enableDebugLog) {
      console.log('[api]', method, fullUrl, data ?? '');
    }
    wx.request({
      url: fullUrl,
      method: method as WechatMiniprogram.RequestOption['method'],
      data,
      header: buildHeader(header),
      timeout,
      success(res) {
        try {
          if (!isSuccessStatus(res.statusCode)) {
            const raw = res.data;
            const message =
              isRecord(raw) && typeof raw.message === 'string'
                ? raw.message
                : `请求失败（HTTP ${res.statusCode}）`;
            const code =
              isRecord(raw) && isRecord(raw.error) && typeof raw.error.code === 'string'
                ? raw.error.code
                : undefined;
            reject(new RequestError(message, res.statusCode, res.data, code));
            return;
          }
          resolve(unwrapResponse<T>(res.statusCode, res.data));
        } catch (error) {
          reject(error instanceof RequestError ? error : new RequestError('响应解析失败', res.statusCode, res.data));
        }
      },
      fail(err) {
        reject(new RequestError(err.errMsg || '网络请求失败'));
      },
    });
  });
}

export function get<T>(
  url: string,
  data?: RequestOptions['data'],
  header?: Record<string, string>,
): Promise<T> {
  return request<T>({ url, method: 'GET', data, header });
}

export function post<T>(url: string, data?: RequestOptions['data'], header?: Record<string, string>) {
  return request<T>({ url, method: 'POST', data, header });
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
