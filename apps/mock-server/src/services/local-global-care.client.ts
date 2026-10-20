import { mockEnv } from '../config/env';
import { liveApiTimeoutMs } from './live-api-timeout';
import { logInfo } from '../utils/logger';

export type LocalGlobalCareRow = {
  id?: number | string;
  campus?: string;
  local_status?: string;
  global_status?: string;
  local_title?: string;
  global_title?: string;
  local_content_html?: string;
  global_content_html?: string;
  local_cover_url?: string;
  global_cover_url?: string;
  local_published_title?: string;
  global_published_title?: string;
  local_published_content_html?: string;
  global_published_content_html?: string;
  local_published_cover_url?: string;
  global_published_cover_url?: string;
  local_published_at?: string | null;
  global_published_at?: string | null;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: LocalGlobalCareRow | null;
};

type LoginData = {
  access: string;
};

type TokenState = {
  access: string;
  fetchedAtMs: number;
};

let tokenState: TokenState | null = null;
let loginInFlight: Promise<string> | null = null;

export function isLocalGlobalCareEnabled(): boolean {
  return mockEnv.LOCAL_GLOBAL_CARE_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.LOCAL_GLOBAL_CARE_API_BASE_URL.replace(/\/+$/, '');
}

async function requestJson<T>(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? liveApiTimeoutMs());
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Local Global Care API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginLocalGlobalCareApi(): Promise<string> {
  if (tokenState && Date.now() - tokenState.fetchedAtMs < 50 * 60_000) {
    return tokenState.access;
  }
  if (loginInFlight) {
    return loginInFlight;
  }
  loginInFlight = (async () => {
    const payload = await requestJson<{ code: number; msg?: string; data?: LoginData }>(
      '/api/token/',
      {
        method: 'POST',
        body: {
          username: mockEnv.LOCAL_GLOBAL_CARE_USERNAME,
          password: mockEnv.LOCAL_GLOBAL_CARE_PASSWORD,
        },
      },
    );
    const access = payload.data?.access;
    if (payload.code !== 2000 || !access) {
      throw new Error(`Local Global Care API 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
    }
    tokenState = { access, fetchedAtMs: Date.now() };
    logInfo('Local Global Care API login ok', {
      base: apiBase(),
      user: mockEnv.LOCAL_GLOBAL_CARE_USERNAME,
    });
    return access;
  })().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginLocalGlobalCareApi();
  return requestJson<T>(path, {
    headers: { Authorization: `JWT ${token}` },
  });
}

/** 管理端：GET /api/local-global-care/care/current/?campus=suzhou */
export async function fetchLocalGlobalCareCurrent(campus: string): Promise<LocalGlobalCareRow | null> {
  const params = new URLSearchParams({ campus });
  const envelope = await authedGet<DetailEnvelope>(`/api/local-global-care/care/current/?${params}`);
  if (envelope.code !== 2000 || !envelope.data) {
    return null;
  }
  return envelope.data;
}
