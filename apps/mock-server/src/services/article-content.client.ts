import { mockEnv } from '../config/env';
import { logInfo } from '../utils/logger';

export type ArticleContentRow = {
  id: number | string;
  content_type?: string;
  title_zh?: string;
  title_en?: string;
  summary?: string;
  content_html?: string;
  category?: string;
  tags?: unknown;
  author?: string;
  source?: string;
  status?: string;
  publish_time?: string | null;
  cover_url?: string;
  cover?: number | null;
  is_home_recommended?: boolean;
  is_top?: boolean;
  views?: number;
  create_datetime?: string;
  update_datetime?: string;
  volume_no?: string;
};

type LoginData = {
  access: string;
  refresh?: string;
};

type ListEnvelope = {
  code: number;
  msg?: string;
  total?: number;
  page?: number;
  limit?: number;
  data?: ArticleContentRow[] | null;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: ArticleContentRow | null;
};

type TokenState = {
  access: string;
  fetchedAtMs: number;
};

const DEFAULT_TTL_MS = 30_000;
let tokenState: TokenState | null = null;

export function isArticleNewsEnabled(): boolean {
  return mockEnv.NEWS_ARTICLE_ENABLED && mockEnv.NODE_ENV !== 'test';
}

function apiBase(): string {
  return mockEnv.NEWS_ARTICLE_API_BASE_URL.replace(/\/+$/, '');
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
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
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
      throw new Error(`Article API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loginArticleApi(force = false): Promise<string> {
  if (!force && tokenState && Date.now() - tokenState.fetchedAtMs < 50 * 60_000) {
    return tokenState.access;
  }
  const payload = await requestJson<{ code: number; msg?: string; data?: LoginData }>(
    '/api/token/',
    {
      method: 'POST',
      body: {
        username: mockEnv.NEWS_ARTICLE_USERNAME,
        password: mockEnv.NEWS_ARTICLE_PASSWORD,
      },
      timeoutMs: 20_000,
    },
  );
  const access = payload.data?.access;
  if (payload.code !== 2000 || !access) {
    throw new Error(`Article API 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
  }
  tokenState = { access, fetchedAtMs: Date.now() };
  logInfo('Article API login ok', { base: apiBase(), user: mockEnv.NEWS_ARTICLE_USERNAME });
  return access;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginArticleApi();
  try {
    return await requestJson<T>(path, {
      headers: { Authorization: `JWT ${token}` },
    });
  } catch {
    // 一次重登重试
    await loginArticleApi(true);
    const retryToken = await loginArticleApi();
    return requestJson<T>(path, {
      headers: { Authorization: `JWT ${retryToken}` },
    });
  }
}

export async function fetchArticleContentList(options?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ArticleContentRow[]> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const params = new URLSearchParams({
    content_type: 'article',
    page: String(page),
    limit: String(limit),
  });
  if (options?.status) {
    params.set('status', options.status);
  }
  const envelope = await authedGet<ListEnvelope>(`/api/article-content/content/?${params}`);
  if (envelope.code !== 2000) {
    throw new Error(`Article 列表失败: ${envelope.msg ?? envelope.code}`);
  }
  return Array.isArray(envelope.data) ? envelope.data : [];
}

export async function fetchArticleContentDetail(id: string | number): Promise<ArticleContentRow> {
  const envelope = await authedGet<DetailEnvelope>(`/api/article-content/content/${id}/`);
  if (envelope.code !== 2000 || !envelope.data) {
    throw new Error(`Article 详情失败 (${id}): ${envelope.msg ?? envelope.code}`);
  }
  return envelope.data;
}

export async function fetchNewsArticlesFromBackend(): Promise<ArticleContentRow[]> {
  const includeDrafts = mockEnv.NEWS_ARTICLE_INCLUDE_DRAFTS;
  if (includeDrafts) {
    // 不过滤 status，拿全部 article（含 draft）
    const rows = await fetchArticleContentList({ limit: mockEnv.NEWS_ARTICLE_LIMIT });
    logInfo('Fetched article-content rows', { count: rows.length, includeDrafts: true });
    return rows;
  }
  const rows = await fetchArticleContentList({
    status: 'published',
    limit: mockEnv.NEWS_ARTICLE_LIMIT,
  });
  logInfo('Fetched article-content rows', { count: rows.length, includeDrafts: false });
  return rows;
}

export function clearArticleApiToken(): void {
  tokenState = null;
}

export { DEFAULT_TTL_MS as ARTICLE_NEWS_SYNC_TTL_MS };
