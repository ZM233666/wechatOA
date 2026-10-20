import { mockEnv } from '../config/env';
import { liveApiTimeoutMs } from './live-api-timeout';
import { logInfo } from '../utils/logger';

export type ManagementHandbookRow = {
  id?: number | string;
  campus?: string;
  status?: string;
  pdf_file_name?: string;
  pdf_url?: string;
  published_pdf_file_name?: string;
  published_pdf_url?: string;
  published_at?: string | null;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: ManagementHandbookRow | null;
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

export function isFinancialHandbookApiEnabled(): boolean {
  return mockEnv.FINANCIAL_HANDBOOK_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.FINANCIAL_HANDBOOK_API_BASE_URL.replace(/\/+$/, '');
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
      throw new Error(`Financial Handbook API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginFinancialHandbookApi(): Promise<string> {
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
          username: mockEnv.FINANCIAL_HANDBOOK_USERNAME,
          password: mockEnv.FINANCIAL_HANDBOOK_PASSWORD,
        },
      },
    );
    const access = payload.data?.access;
    if (payload.code !== 2000 || !access) {
      throw new Error(`Financial Handbook API 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
    }
    tokenState = { access, fetchedAtMs: Date.now() };
    logInfo('Financial Handbook API login ok', {
      base: apiBase(),
      user: mockEnv.FINANCIAL_HANDBOOK_USERNAME,
    });
    return access;
  })().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginFinancialHandbookApi();
  return requestJson<T>(path, {
    headers: { Authorization: `JWT ${token}` },
  });
}

/** 管理端财务手册 current（路径可配置，默认与员工手册 ViewSet 结构一致） */
export async function fetchFinancialHandbookCurrent(
  campus = mockEnv.FINANCIAL_HANDBOOK_CAMPUS,
): Promise<ManagementHandbookRow | null> {
  const basePath = mockEnv.FINANCIAL_HANDBOOK_CURRENT_PATH.replace(/\/+$/, '');
  const params = new URLSearchParams({ campus });
  const envelope = await authedGet<DetailEnvelope>(`${basePath}/?${params}`);
  if (envelope.code !== 2000 || !envelope.data) {
    return null;
  }
  return envelope.data;
}

export function pickPublishedHandbookPdfUrl(row: ManagementHandbookRow): string | undefined {
  const status = (row.status || '').toLowerCase();
  if (status && status !== 'published') {
    return undefined;
  }
  const url = (row.published_pdf_url || row.pdf_url || '').trim();
  return url || undefined;
}
