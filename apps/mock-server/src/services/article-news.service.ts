import { mockEnv } from '../config/env';
import { logInfo, logWarn } from '../utils/logger';
import type { NewsArticleFixture } from '../schemas/news.schema';
import {
  ARTICLE_NEWS_SYNC_TTL_MS,
  fetchArticleContentDetail,
  fetchNewsArticlesFromBackend,
  isArticleNewsEnabled,
} from './article-content.client';
import { mapArticleRowToNewsFixture } from './article-news.mapper';
import { hydrateArticleMedia } from './article-media-mirror.service';

type SyncState = {
  lastAttemptMs: number;
  lastSuccessMs: number;
  lastError?: string;
  inFlight: Promise<NewsArticleFixture[]> | null;
  articles: NewsArticleFixture[];
  categories: Array<{ id: string; name: string }>;
};

const state: SyncState = {
  lastAttemptMs: 0,
  lastSuccessMs: 0,
  inFlight: null,
  articles: [],
  categories: [{ id: 'general', name: '新闻' }],
};

/** 管理端列表不含 content_html，详情接口按需拉取后缓存 */
const detailCache = new Map<string, NewsArticleFixture>();
const detailRequests = new Map<string, Promise<NewsArticleFixture>>();

function articleBackendId(fixtureId: string): string {
  return fixtureId.replace(/^article-/, '');
}

function deriveCategories(articles: NewsArticleFixture[]): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  articles.forEach((article) => {
    map.set(article.category.id, article.category.name);
  });
  if (!map.size) {
    return [{ id: 'general', name: '新闻' }];
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

export async function syncArticleNews(options?: {
  force?: boolean;
  ttlMs?: number;
}): Promise<NewsArticleFixture[]> {
  if (!isArticleNewsEnabled()) {
    return [];
  }
  const ttlMs = options?.ttlMs ?? ARTICLE_NEWS_SYNC_TTL_MS;
  const now = Date.now();
  if (!options?.force && state.inFlight) {
    return state.inFlight;
  }
  if (!options?.force && now - state.lastSuccessMs < ttlMs && state.articles.length) {
    return state.articles;
  }

  const run = (async () => {
    state.lastAttemptMs = Date.now();
    try {
      const rows = await fetchNewsArticlesFromBackend();
      const articles = await Promise.all(
        rows.map(async (row) => hydrateArticleMedia(row, mapArticleRowToNewsFixture(row))),
      );
      const latestById = new Map(articles.map((article) => [article.id, article]));
      for (const [key, cached] of detailCache) {
        const latest = latestById.get(cached.id);
        if (!latest || latest.updatedAt !== cached.updatedAt) {
          detailCache.delete(key);
        }
      }
      state.articles = articles;
      state.categories = deriveCategories(articles);
      state.lastSuccessMs = Date.now();
      state.lastError = undefined;
      void prewarmArticleNewsDetails(articles);
      logInfo('Synced news from article-content', {
        count: articles.length,
        includeDrafts: mockEnv.NEWS_ARTICLE_INCLUDE_DRAFTS,
      });
      return articles;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      state.lastError = message;
      logWarn('Article news sync failed; keeping previous cache/fixtures fallback', { message });
      return state.articles;
    } finally {
      state.inFlight = null;
    }
  })();

  state.inFlight = run;
  return run;
}

export function refreshArticleNewsInBackground(): void {
  if (!isArticleNewsEnabled()) {
    return;
  }
  void syncArticleNews();
}

export function getArticleNewsArticles(): NewsArticleFixture[] {
  return state.articles;
}

export function getArticleNewsCategories(): Array<{ id: string; name: string }> {
  return state.categories;
}

/**
 * 用 article-content 详情补全正文（列表行无 content_html）。
 * 失败时回退列表缓存中的摘要项。
 */
export function invalidateArticleNewsDetailCache(fixture: NewsArticleFixture): void {
  detailCache.delete(fixture.id);
  detailCache.delete(fixture.slug);
}

async function prewarmArticleNewsDetails(articles: NewsArticleFixture[]): Promise<void> {
  for (const article of articles) {
    await hydrateArticleNewsDetail(article);
  }
}

export async function hydrateArticleNewsDetail(
  fixture: NewsArticleFixture,
  options?: { skipCache?: boolean },
): Promise<NewsArticleFixture> {
  if (!options?.skipCache) {
    const cached = detailCache.get(fixture.id) ?? detailCache.get(fixture.slug);
    if (cached) {
      return cached;
    }
  }

  const pending = detailRequests.get(fixture.id) ?? detailRequests.get(fixture.slug);
  if (pending) {
    return pending;
  }

  const backendId = articleBackendId(fixture.id);
  const request = (async () => {
    try {
      const row = await fetchArticleContentDetail(backendId);
      const hydrated = await hydrateArticleMedia(row, mapArticleRowToNewsFixture(row));
      detailCache.set(hydrated.id, hydrated);
      detailCache.set(hydrated.slug, hydrated);
      const idx = state.articles.findIndex((item) => item.id === hydrated.id);
      if (idx >= 0) {
        state.articles[idx] = hydrated;
      }
      return hydrated;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Article news detail fetch failed; using list row without body', {
        id: backendId,
        message,
      });
      return fixture;
    } finally {
      detailRequests.delete(fixture.id);
      detailRequests.delete(fixture.slug);
    }
  })();
  detailRequests.set(fixture.id, request);
  detailRequests.set(fixture.slug, request);
  return request;
}

export function getArticleNewsStatus(): {
  enabled: boolean;
  count: number;
  lastSuccessMs: number;
  lastError?: string;
} {
  return {
    enabled: isArticleNewsEnabled(),
    count: state.articles.length,
    lastSuccessMs: state.lastSuccessMs,
    lastError: state.lastError,
  };
}
