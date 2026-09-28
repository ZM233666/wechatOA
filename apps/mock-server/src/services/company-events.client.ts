import { mockEnv } from '../config/env';
import { liveApiTimeoutMs } from './live-api-timeout';
import { logInfo } from '../utils/logger';

export type AnnualDinnerRow = {
  id?: number;
  title?: string;
  event_time?: string;
  venue?: string;
  dress_code?: string;
  highlights?: string[];
  status?: string;
};

export type OutingActivityRow = {
  id?: number;
  title?: string;
  description?: string;
  event_date?: string;
  signup_status?: string;
  status?: string;
  registration_count?: number;
};

export type HealthCheckupImageRow = {
  id?: number;
  url?: string;
  file_name?: string;
  sort?: number;
};

export type HealthCheckupRow = {
  id?: number;
  title?: string;
  subtitle?: string;
  pdf_url?: string;
  pdf_file_name?: string;
  images?: HealthCheckupImageRow[];
  status?: string;
};

type DetailEnvelope<T> = {
  code: number;
  msg?: string;
  data?: T | null;
};

type ListEnvelope<T> = {
  code: number;
  msg?: string;
  data?: T[] | null;
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

export function isCompanyEventsEnabled(): boolean {
  return mockEnv.COMPANY_EVENTS_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.COMPANY_EVENTS_API_BASE_URL.replace(/\/+$/, '');
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
      throw new Error(`Company Events API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginCompanyEventsApi(): Promise<string> {
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
          username: mockEnv.COMPANY_EVENTS_USERNAME,
          password: mockEnv.COMPANY_EVENTS_PASSWORD,
        },
      },
    );
    const access = payload.data?.access;
    if (payload.code !== 2000 || !access) {
      throw new Error(`Company Events API 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
    }
    tokenState = { access, fetchedAtMs: Date.now() };
    logInfo('Company Events API login ok', { base: apiBase(), user: mockEnv.COMPANY_EVENTS_USERNAME });
    return access;
  })().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginCompanyEventsApi();
  return requestJson<T>(path, {
    headers: { Authorization: `JWT ${token}` },
  });
}

export async function fetchAnnualDinner(): Promise<AnnualDinnerRow | null> {
  const envelope = await authedGet<DetailEnvelope<AnnualDinnerRow>>('/api/company-events/annual-dinner/');
  if (envelope.code !== 2000 || !envelope.data) {
    return null;
  }
  return envelope.data;
}

export async function fetchOutingActivities(): Promise<OutingActivityRow[]> {
  const params = new URLSearchParams({ page: '1', limit: '50' });
  const envelope = await authedGet<ListEnvelope<OutingActivityRow>>(
    `/api/company-events/outing-activities/?${params}`,
  );
  if (envelope.code !== 2000) {
    throw new Error(`团建出游列表失败: ${envelope.msg ?? envelope.code}`);
  }
  return Array.isArray(envelope.data) ? envelope.data : [];
}

export async function fetchHealthCheckup(): Promise<HealthCheckupRow | null> {
  const envelope = await authedGet<DetailEnvelope<HealthCheckupRow>>('/api/company-events/health-checkup/');
  if (envelope.code !== 2000 || !envelope.data) {
    return null;
  }
  return envelope.data;
}
