import { mockEnv } from '../config/env';
import { liveApiTimeoutMs } from './live-api-timeout';
import { logInfo } from '../utils/logger';

export type JobOpeningRow = {
  id: number | string;
  content_type?: string;
  title_zh?: string;
  title_en?: string;
  summary?: string;
  content_html?: string;
  content_json?: Record<string, unknown> | null;
  category?: string;
  source?: string;
  status?: string;
  publish_time?: string | null;
  update_datetime?: string;
};

type ListEnvelope = {
  code: number;
  msg?: string;
  data?: JobOpeningRow[] | null;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: JobOpeningRow | null;
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

export function isJobOpeningsEnabled(): boolean {
  return mockEnv.JOB_OPENINGS_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.JOB_OPENINGS_API_BASE_URL.replace(/\/+$/, '');
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
      throw new Error(`Job Openings API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginJobOpeningsApi(): Promise<string> {
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
          username: mockEnv.JOB_OPENINGS_USERNAME,
          password: mockEnv.JOB_OPENINGS_PASSWORD,
        },
      },
    );
    const access = payload.data?.access;
    if (payload.code !== 2000 || !access) {
      throw new Error(`Job Openings API 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
    }
    tokenState = { access, fetchedAtMs: Date.now() };
    logInfo('Job Openings API login ok', { base: apiBase(), user: mockEnv.JOB_OPENINGS_USERNAME });
    return access;
  })().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginJobOpeningsApi();
  return requestJson<T>(path, {
    headers: { Authorization: `JWT ${token}` },
  });
}

/** 管理端：GET /api/article-content/content/?content_type=job_openings&status=published */
export async function fetchPublishedJobOpenings(): Promise<JobOpeningRow[]> {
  const params = new URLSearchParams({
    content_type: 'job_openings',
    status: 'published',
    page: '1',
    limit: '100',
  });
  const envelope = await authedGet<ListEnvelope>(`/api/article-content/content/?${params}`);
  if (envelope.code !== 2000) {
    throw new Error(`Job Openings 列表失败: ${envelope.msg ?? envelope.code}`);
  }
  const batch = Array.isArray(envelope.data) ? envelope.data : [];
  return batch.filter((row) => (row.status || '').toLowerCase() === 'published' && row.id != null);
}

export async function fetchJobOpeningDetail(backendId: string | number): Promise<JobOpeningRow> {
  const envelope = await authedGet<DetailEnvelope>(
    `/api/article-content/content/${encodeURIComponent(String(backendId))}/`,
  );
  if (envelope.code !== 2000 || !envelope.data) {
    throw new Error(`Job Opening 详情失败 (${backendId}): ${envelope.msg ?? envelope.code}`);
  }
  return envelope.data;
}
