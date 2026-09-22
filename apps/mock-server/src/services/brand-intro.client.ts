import { mockEnv } from '../config/env';
import { logInfo, logWarn } from '../utils/logger';

export type BrandIntroValueItem = {
  id?: string;
  title?: string;
  content?: string;
};

export type BrandIntroCoreBrand = {
  id?: string;
  name?: string;
  description?: string;
};

export type BrandIntroRow = {
  id: number | string;
  company_name?: string;
  company_profile?: string;
  our_vision?: string;
  our_value_items?: BrandIntroValueItem[];
  core_brands?: BrandIntroCoreBrand[];
  cover_url?: string;
  content_html?: string;
  publish_time?: string | null;
  create_datetime?: string;
  status?: string;
};

type PublicEnvelope = {
  code: number;
  msg?: string;
  data?: BrandIntroRow | null;
};

type ListEnvelope = {
  code: number;
  msg?: string;
  data?: BrandIntroSummary[] | null;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: BrandIntroRow | null;
};

type BrandIntroSummary = {
  id: number | string;
  company_name?: string;
  status?: string;
  publish_time?: string | null;
  create_datetime?: string;
  cover_url?: string;
};

type LoginData = {
  access: string;
};

type TokenState = {
  access: string;
  fetchedAtMs: number;
};

export const BRAND_INTRO_SYNC_TTL_MS = 30_000;

let tokenState: TokenState | null = null;

export function isBrandIntroEnabled(): boolean {
  return mockEnv.BRAND_INTRO_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.BRAND_INTRO_API_BASE_URL.replace(/\/+$/, '');
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
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
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
      throw new Error(`Brand Intro API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginAdminApi(force = false): Promise<string> {
  if (!force && tokenState && Date.now() - tokenState.fetchedAtMs < 50 * 60_000) {
    return tokenState.access;
  }
  const payload = await requestJson<{ code: number; msg?: string; data?: LoginData }>(
    '/api/token/',
    {
      method: 'POST',
      body: {
        username: mockEnv.BRAND_INTRO_USERNAME,
        password: mockEnv.BRAND_INTRO_PASSWORD,
      },
      timeoutMs: 20_000,
    },
  );
  const access = payload.data?.access;
  if (payload.code !== 2000 || !access) {
    throw new Error(`Brand Intro 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
  }
  tokenState = { access, fetchedAtMs: Date.now() };
  logInfo('Brand Intro admin API login ok', { base: apiBase(), user: mockEnv.BRAND_INTRO_USERNAME });
  return access;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginAdminApi();
  try {
    return await requestJson<T>(path, {
      headers: { Authorization: `JWT ${token}` },
    });
  } catch {
    await loginAdminApi(true);
    const retryToken = await loginAdminApi();
    return requestJson<T>(path, {
      headers: { Authorization: `JWT ${retryToken}` },
    });
  }
}

async function fetchBrandIntroPublic(): Promise<BrandIntroRow | null> {
  const path = mockEnv.BRAND_INTRO_PUBLIC_PATH.startsWith('/')
    ? mockEnv.BRAND_INTRO_PUBLIC_PATH
    : `/${mockEnv.BRAND_INTRO_PUBLIC_PATH}`;
  const envelope = await requestJson<PublicEnvelope>(path);
  if (envelope.code !== 2000) {
    throw new Error(`Brand Intro 公开接口失败: ${envelope.msg ?? JSON.stringify(envelope)}`);
  }
  return envelope.data ?? null;
}

async function fetchBrandIntroFromAdmin(): Promise<BrandIntroRow | null> {
  const params = new URLSearchParams({
    status: 'published',
    page: '1',
    limit: '20',
    ordering: '-publish_time',
  });
  const listEnvelope = await authedGet<ListEnvelope>(`/api/brand-intro/intro/?${params}`);
  if (listEnvelope.code !== 2000) {
    throw new Error(`Brand Intro 列表失败: ${listEnvelope.msg ?? listEnvelope.code}`);
  }
  const rows = (Array.isArray(listEnvelope.data) ? listEnvelope.data : []).filter(
    (item) => item.status === 'published',
  );
  if (!rows.length) {
    return null;
  }
  const latest = rows.sort((a, b) => {
    const aTime = Date.parse(String(a.publish_time ?? a.create_datetime ?? '')) || 0;
    const bTime = Date.parse(String(b.publish_time ?? b.create_datetime ?? '')) || 0;
    return bTime - aTime;
  })[0];
  const detailEnvelope = await authedGet<DetailEnvelope>(`/api/brand-intro/intro/${latest.id}/`);
  if (detailEnvelope.code !== 2000 || !detailEnvelope.data) {
    throw new Error(`Brand Intro 详情失败 (${latest.id}): ${detailEnvelope.msg ?? detailEnvelope.code}`);
  }
  return detailEnvelope.data;
}

/**
 * 优先公开读接口；未实现或 404 时回退管理端 JWT（与新闻 article-content 相同联调方式）。
 */
export async function fetchBrandIntroFromBackend(): Promise<BrandIntroRow | null> {
  if (mockEnv.BRAND_INTRO_TRY_PUBLIC) {
    try {
      const row = await fetchBrandIntroPublic();
      if (row) {
        logInfo('Brand intro loaded from public API', { id: row.id });
        return row;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Brand intro public API unavailable; falling back to admin API', { message });
    }
  }

  const row = await fetchBrandIntroFromAdmin();
  if (row) {
    logInfo('Brand intro loaded from admin API', { id: row.id });
  }
  return row;
}
