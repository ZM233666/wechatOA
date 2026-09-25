import { mockEnv } from '../config/env';
import { liveApiTimeoutMs } from './live-api-timeout';
import { logInfo } from '../utils/logger';

export type ShuttleScheduleStopRow = {
  id?: number;
  stop: number;
  stop_name?: string;
  address?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  sequence: number;
  times?: string[];
};

export type ShuttleScheduleRouteRow = {
  id: number | string;
  location?: string;
  name: string;
  sort?: number;
  is_active?: boolean;
  stops?: ShuttleScheduleStopRow[];
};

type ListEnvelope = {
  code: number;
  msg?: string;
  data?: ShuttleScheduleRouteRow[] | null;
  is_next?: boolean;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: ShuttleScheduleRouteRow | null;
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

export function isShuttleScheduleEnabled(): boolean {
  return mockEnv.SHUTTLE_SCHEDULE_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.SHUTTLE_SCHEDULE_API_BASE_URL.replace(/\/+$/, '');
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
      throw new Error(`Shuttle Schedule API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginShuttleScheduleApi(): Promise<string> {
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
          username: mockEnv.SHUTTLE_SCHEDULE_USERNAME,
          password: mockEnv.SHUTTLE_SCHEDULE_PASSWORD,
        },
      },
    );
    const access = payload.data?.access;
    if (payload.code !== 2000 || !access) {
      throw new Error(`Shuttle Schedule API 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
    }
    tokenState = { access, fetchedAtMs: Date.now() };
    logInfo('Shuttle Schedule API login ok', { base: apiBase(), user: mockEnv.SHUTTLE_SCHEDULE_USERNAME });
    return access;
  })().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginShuttleScheduleApi();
  return requestJson<T>(path, {
    headers: { Authorization: `JWT ${token}` },
  });
}

export function needsShuttleRouteDetail(row: ShuttleScheduleRouteRow): boolean {
  return !row.stops?.length;
}

export async function fetchShuttleRoutes(location: string): Promise<ShuttleScheduleRouteRow[]> {
  const rows: ShuttleScheduleRouteRow[] = [];
  let page = 1;
  let hasNext = true;
  while (hasNext && page <= 20) {
    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
      location,
    });
    const envelope = await authedGet<ListEnvelope>(`/api/shuttle-schedule/route/?${params}`);
    if (envelope.code !== 2000) {
      throw new Error(`Shuttle Schedule 列表失败: ${envelope.msg ?? envelope.code}`);
    }
    const batch = Array.isArray(envelope.data) ? envelope.data : [];
    rows.push(...batch.filter((row) => row.is_active !== false));
    hasNext = Boolean(envelope.is_next) && batch.length > 0;
    page += 1;
  }
  return rows.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.name).localeCompare(String(b.name), 'zh-CN'));
}

export async function fetchShuttleRouteDetail(id: number | string): Promise<ShuttleScheduleRouteRow> {
  const envelope = await authedGet<DetailEnvelope>(`/api/shuttle-schedule/route/${id}/`);
  if (envelope.code !== 2000 || !envelope.data) {
    throw new Error(`Shuttle Schedule 详情失败 (${id}): ${envelope.msg ?? envelope.code}`);
  }
  return envelope.data;
}
