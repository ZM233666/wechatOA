import { mockEnv } from '../config/env';
import { logInfo } from '../utils/logger';

export type ProjectCaseRow = {
  id: number | string;
  title_zh?: string;
  title_en?: string;
  summary?: string;
  content_html?: string;
  cover_url?: string;
  category?: string;
  tags?: unknown;
  author?: string;
  status?: string;
  publish_time?: string | null;
  visible_range?: string;
  allow_share?: boolean;
  views?: number;
  shares?: number;
  update_datetime?: string;
};

type ListEnvelope = {
  code: number;
  msg?: string;
  page?: number;
  limit?: number;
  total?: number;
  is_next?: boolean;
  is_previous?: boolean;
  data?: ProjectCaseRow[] | null;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: ProjectCaseRow | null;
};

type LoginData = {
  access: string;
};

type TokenState = {
  access: string;
  fetchedAtMs: number;
};

export const PROJECT_CASE_SYNC_TTL_MS = 30_000;

let tokenState: TokenState | null = null;

export function isProjectCaseEnabled(): boolean {
  return mockEnv.PROJECT_CASE_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.PROJECT_CASE_API_BASE_URL.replace(/\/+$/, '');
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
      throw new Error(`Project Case API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginProjectCaseApi(force = false): Promise<string> {
  if (!force && tokenState && Date.now() - tokenState.fetchedAtMs < 50 * 60_000) {
    return tokenState.access;
  }
  const payload = await requestJson<{ code: number; msg?: string; data?: LoginData }>(
    '/api/token/',
    {
      method: 'POST',
      body: {
        username: mockEnv.PROJECT_CASE_USERNAME,
        password: mockEnv.PROJECT_CASE_PASSWORD,
      },
      timeoutMs: 20_000,
    },
  );
  const access = payload.data?.access;
  if (payload.code !== 2000 || !access) {
    throw new Error(`Project Case API 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
  }
  tokenState = { access, fetchedAtMs: Date.now() };
  logInfo('Project Case API login ok', { base: apiBase(), user: mockEnv.PROJECT_CASE_USERNAME });
  return access;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginProjectCaseApi();
  try {
    return await requestJson<T>(path, {
      headers: { Authorization: `JWT ${token}` },
    });
  } catch {
    await loginProjectCaseApi(true);
    const retryToken = await loginProjectCaseApi();
    return requestJson<T>(path, {
      headers: { Authorization: `JWT ${retryToken}` },
    });
  }
}

export function isPublicProjectCaseRow(row: ProjectCaseRow): boolean {
  const status = (row.status || 'published').toLowerCase();
  if (status !== 'published') {
    return false;
  }
  const visibleRange = (row.visible_range || 'all').toLowerCase();
  return visibleRange === 'all';
}

export async function fetchProjectCaseList(options?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<ProjectCaseRow[]> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? mockEnv.PROJECT_CASE_LIMIT;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status: 'published',
  });
  if (options?.category?.trim()) {
    params.set('category', options.category.trim());
  }
  if (options?.search?.trim()) {
    params.set('search', options.search.trim());
  }
  const envelope = await authedGet<ListEnvelope>(`/api/project-case/cases/?${params}`);
  if (envelope.code !== 2000) {
    throw new Error(`Project Case 列表失败: ${envelope.msg ?? envelope.code}`);
  }
  return Array.isArray(envelope.data) ? envelope.data.filter(isPublicProjectCaseRow) : [];
}

export async function fetchProjectCaseDetail(id: string | number): Promise<ProjectCaseRow> {
  const envelope = await authedGet<DetailEnvelope>(`/api/project-case/cases/${id}/`);
  if (envelope.code !== 2000 || !envelope.data) {
    throw new Error(`Project Case 详情失败 (${id}): ${envelope.msg ?? envelope.code}`);
  }
  if (!isPublicProjectCaseRow(envelope.data)) {
    throw new Error(`Project Case 详情不可见 (${id})`);
  }
  return envelope.data;
}

export async function fetchAllPublishedProjectCases(): Promise<ProjectCaseRow[]> {
  const limit = mockEnv.PROJECT_CASE_LIMIT;
  const rows: ProjectCaseRow[] = [];
  let page = 1;
  let hasNext = true;
  while (hasNext && page <= 20) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status: 'published',
    });
    const envelope = await authedGet<ListEnvelope>(`/api/project-case/cases/?${params}`);
    if (envelope.code !== 2000) {
      throw new Error(`Project Case 列表失败: ${envelope.msg ?? envelope.code}`);
    }
    const batch = Array.isArray(envelope.data) ? envelope.data.filter(isPublicProjectCaseRow) : [];
    rows.push(...batch);
    hasNext = Boolean(envelope.is_next) && batch.length > 0;
    page += 1;
  }
  logInfo('Fetched project-case rows', { count: rows.length });
  return rows;
}

export function clearProjectCaseApiToken(): void {
  tokenState = null;
}
