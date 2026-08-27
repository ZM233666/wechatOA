import { mockEnv } from '../config/env';
import { logInfo, logWarn } from '../utils/logger';
import type { NewsArticleFixture } from '../schemas/news.schema';
import {
  ARTICLE_NEWS_SYNC_TTL_MS,
  fetchNewsArticlesFromBackend,
  isArticleNewsEnabled,
} from './article-content.client';
import { mapArticleRowToNewsFixture } from './article-news.mapper';

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
      const articles = rows.map((row) => mapArticleRowToNewsFixture(row));
      state.articles = articles;
      state.categories = deriveCategories(articles);
      state.lastSuccessMs = Date.now();
      state.lastError = undefined;
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
