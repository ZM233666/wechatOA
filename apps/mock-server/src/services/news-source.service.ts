import { getFixtures } from './fixture.service';
import type { NewsArticleFixture } from '../schemas/news.schema';
import { isArticleNewsEnabled } from './article-content.client';
import {
  getArticleNewsArticles,
  getArticleNewsCategories,
  hydrateArticleNewsDetail,
  invalidateArticleNewsDetailCache,
  refreshArticleNewsInBackground,
  syncArticleNews,
} from './article-news.service';
import { hasUsableNewsBody } from './news-body-presentation';

/**
 * 优先使用管理端 article-content 缓存；缓存为空时同步等待一次拉取。
 * 远程仍失败时回退本地 fixtures（联调离线可用）。
 */
export async function getNewsArticlesForRequest(): Promise<NewsArticleFixture[]> {
  if (isArticleNewsEnabled()) {
    let articles = getArticleNewsArticles();
    if (!articles.length) {
      articles = await syncArticleNews({ force: true });
    } else {
      refreshArticleNewsInBackground();
    }
    if (articles.length) {
      return articles;
    }
  }
  return getFixtures().newsArticles;
}

export async function getNewsCategoriesForRequest(): Promise<Array<{ id: string; name: string }>> {
  if (isArticleNewsEnabled()) {
    const articles = await getNewsArticlesForRequest();
    if (articles.length && getArticleNewsArticles().length) {
      return getArticleNewsCategories();
    }
  }
  return getFixtures().newsCategories;
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
  // CMS 列表为 article-* 时，仍允许用 fixtures 中的稳定 ID（如 news-001）打开详情（文档/编译模式深链）
  if (!found) {
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
