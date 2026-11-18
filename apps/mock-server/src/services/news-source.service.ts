import { logInfo } from '../utils/logger';
import { HttpError } from '../middleware/error-handler.middleware';
import { getFixtures } from './fixture.service';
import type { NewsArticleFixture } from '../schemas/news.schema';
import { isArticleNewsEnabled } from './article-content.client';
import {
  getArticleNewsArticles,
  getArticleNewsCategories,
  getArticleNewsStatus,
  hydrateArticleNewsDetail,
  invalidateArticleNewsDetailCache,
  refreshArticleNewsInBackground,
  syncArticleNews,
} from './article-news.service';
import { hasUsableNewsBody } from './news-body-presentation';

/** Fixtures are explicit demo/offline mode only (NEWS_ARTICLE_ENABLED=false). */
export function getNewsSourceStatus() {
  if (!isArticleNewsEnabled()) {
    return { source: 'fixtures' as const, state: 'success' as const, count: getFixtures().newsArticles.length };
  }
  const status = getArticleNewsStatus();
  return {
    source: 'cms' as const,
    state: status.lastError
      ? status.lastSuccessMs > 0 ? 'stale' as const : 'error' as const
      : status.count ? 'success' as const : 'empty' as const,
    count: status.count,
    ...(status.lastError ? { errorCategory: status.lastError } : {}),
  };
}

export async function getNewsArticlesForRequest(): Promise<NewsArticleFixture[]> {
  if (!isArticleNewsEnabled()) {
    const articles = getFixtures().newsArticles;
    logInfo('News source', getNewsSourceStatus());
    return articles;
  }
  const before = getArticleNewsStatus();
  if (!before.lastSuccessMs || !getArticleNewsArticles().length) {
    // Includes a successfully cached empty list; sync respects its normal TTL.
    await syncArticleNews();
  } else {
    refreshArticleNewsInBackground();
  }
  const status = getArticleNewsStatus();
  if (status.lastError && !status.lastSuccessMs) {
    throw new HttpError(503, '新闻服务暂不可用，请稍后重试', 'NEWS_SOURCE_UNAVAILABLE', getNewsSourceStatus());
  }
  return getArticleNewsArticles();
}

export async function getNewsCategoriesForRequest(): Promise<Array<{ id: string; name: string }>> {
  if (!isArticleNewsEnabled()) return getFixtures().newsCategories;
  await getNewsArticlesForRequest();
  return getArticleNewsCategories();
}

export function findNewsArticle(
  articles: NewsArticleFixture[],
  idOrSlug: string,
): NewsArticleFixture | undefined {
  return articles.find(
    (item) =>
      item.id === idOrSlug ||
      item.slug === idOrSlug ||
      item.id === `article-${idOrSlug}` ||
      item.id.replace(/^article-/, '') === idOrSlug,
  );
}

/** 详情页：article-content 列表无正文，需再拉单条详情补全 contentHtml / richContent */
export async function getNewsArticleForDetail(idOrSlug: string): Promise<NewsArticleFixture | undefined> {
  const articles = await getNewsArticlesForRequest();
  let found = findNewsArticle(articles, idOrSlug);
  // Never cross from CMS into fixture detail IDs.
  if (!found && !isArticleNewsEnabled()) {
    found = findNewsArticle(getFixtures().newsArticles, idOrSlug);
  }
  if (!found) {
    return undefined;
  }
  if (
    isArticleNewsEnabled() &&
    getArticleNewsArticles().length &&
    found.id.startsWith('article-')
  ) {
    let hydrated = await hydrateArticleNewsDetail(found);
    if (
      !hasUsableNewsBody(hydrated.bodyFormat, hydrated.richContent, hydrated.contentHtml)
    ) {
      invalidateArticleNewsDetailCache(hydrated);
      hydrated = await hydrateArticleNewsDetail(found, { skipCache: true });
    }
    return hydrated;
  }
  return found;
}
