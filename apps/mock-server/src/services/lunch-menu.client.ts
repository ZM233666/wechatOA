import { mockEnv } from '../config/env';
import { liveApiTimeoutMs } from './live-api-timeout';
import { logInfo } from '../utils/logger';

export type LunchMenuModule = {
  id?: string;
  type?: string;
  enabled?: boolean;
  order?: number;
  list_text?: string;
  images?: Array<string | null>;
  image?: string | null;
  dishes?: Array<{
    name?: string;
    composition?: string;
    image?: string | null;
  }>;
};

export type LunchMenuContent = {
  modules?: LunchMenuModule[];
};

export type LunchMenuRow = {
  id: number | string | null;
  campus?: string;
  menu_date?: string;
  title?: string;
  cover_image?: string;
  status?: string;
  content?: LunchMenuContent | null;
  published_content?: LunchMenuContent | null;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: LunchMenuRow | null;
};

type ListEnvelope = {
  code: number;
  msg?: string;
  data?: LunchMenuRow[] | null;
  is_next?: boolean;
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

export function isLunchMenuEnabled(): boolean {
  return mockEnv.LUNCH_MENU_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.LUNCH_MENU_API_BASE_URL.replace(/\/+$/, '');
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
      throw new Error(`Lunch Menu API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginLunchMenuApi(): Promise<string> {
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
          username: mockEnv.LUNCH_MENU_USERNAME,
          password: mockEnv.LUNCH_MENU_PASSWORD,
        },
      },
    );
    const access = payload.data?.access;
    if (payload.code !== 2000 || !access) {
      throw new Error(`Lunch Menu API 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
    }
    tokenState = { access, fetchedAtMs: Date.now() };
    logInfo('Lunch Menu API login ok', { base: apiBase(), user: mockEnv.LUNCH_MENU_USERNAME });
    return access;
  })().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginLunchMenuApi();
  return requestJson<T>(path, {
    headers: { Authorization: `JWT ${token}` },
  });
}

export async function fetchLunchMenuByDate(campus: string, menuDate: string): Promise<LunchMenuRow | null> {
  const params = new URLSearchParams({ campus, menu_date: menuDate });
  const envelope = await authedGet<DetailEnvelope>(`/api/lunch-menu/menu/by_date/?${params}`);
  if (envelope.code !== 2000 || !envelope.data) {
    return null;
  }
  return envelope.data;
}

export async function fetchPublishedLunchMenus(campus: string): Promise<LunchMenuRow[]> {
  const params = new URLSearchParams({
    page: '1',
    limit: '20',
    campus,
    status: 'published',
  });
  const envelope = await authedGet<ListEnvelope>(`/api/lunch-menu/menu/?${params}`);
  if (envelope.code !== 2000) {
    throw new Error(`Lunch Menu 列表失败: ${envelope.msg ?? envelope.code}`);
  }
  const batch = Array.isArray(envelope.data) ? envelope.data : [];
  return batch.filter((row) => (row.status || '').toLowerCase() === 'published' && row.id != null);
}
