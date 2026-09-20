import { getFixtures } from './fixture.service';
import type { NewsArticleFixture } from '../schemas/news.schema';
import { isArticleNewsEnabled } from './article-content.client';
import {
  getArticleNewsArticles,
  getArticleNewsCategories,
  refreshArticleNewsInBackground,
  syncArticleNews,
} from './article-news.service';

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
