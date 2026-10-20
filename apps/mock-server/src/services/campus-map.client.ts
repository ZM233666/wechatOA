import { mockEnv } from '../config/env';
import { liveApiTimeoutMs } from './live-api-timeout';
import { logInfo } from '../utils/logger';

export type CampusMapFileRow = {
  object_key?: string;
  file_name?: string;
  size?: number;
  last_modified?: string;
  url?: string;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: {
    location?: string;
    rows?: CampusMapFileRow[];
    total?: number;
  } | null;
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

export function isCampusMapApiEnabled(): boolean {
  return mockEnv.CAMPUS_MAP_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.CAMPUS_MAP_API_BASE_URL.replace(/\/+$/, '');
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
      throw new Error(`Campus Map API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginCampusMapApi(): Promise<string> {
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
          username: mockEnv.CAMPUS_MAP_USERNAME,
          password: mockEnv.CAMPUS_MAP_PASSWORD,
        },
      },
    );
    const access = payload.data?.access;
    if (payload.code !== 2000 || !access) {
      throw new Error(`Campus Map API 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
    }
    tokenState = { access, fetchedAtMs: Date.now() };
    logInfo('Campus Map API login ok', { base: apiBase(), user: mockEnv.CAMPUS_MAP_USERNAME });
    return access;
  })().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginCampusMapApi();
  return requestJson<T>(path, {
    headers: { Authorization: `JWT ${token}` },
  });
}

/** 管理端：GET /api/campus-map/files/?location=suzhou */
export async function fetchCampusMapFiles(campus: string): Promise<CampusMapFileRow[]> {
  const params = new URLSearchParams({ location: campus });
  const envelope = await authedGet<DetailEnvelope>(`/api/campus-map/files/?${params}`);
  if (envelope.code !== 2000) {
    throw new Error(`Campus Map 文件列表失败: ${envelope.msg ?? envelope.code}`);
  }
  return Array.isArray(envelope.data?.rows) ? envelope.data.rows : [];
}
