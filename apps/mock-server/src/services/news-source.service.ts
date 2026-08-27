import { getFixtures } from './fixture.service';
import type { NewsArticleFixture } from '../schemas/news.schema';
import { isArticleNewsEnabled } from './article-content.client';
import {
  getArticleNewsArticles,
  getArticleNewsCategories,
  refreshArticleNewsInBackground,
} from './article-news.service';

/** 请求路径上刷新 article 缓存，并返回当前新闻文章集合 */
export function getNewsArticlesForRequest(): NewsArticleFixture[] {
  if (isArticleNewsEnabled()) {
    refreshArticleNewsInBackground();
    const articles = getArticleNewsArticles();
    if (articles.length) {
      return articles;
    }
  }
  return getFixtures().newsArticles;
}

export function getNewsCategoriesForRequest(): Array<{ id: string; name: string }> {
  if (isArticleNewsEnabled()) {
    refreshArticleNewsInBackground();
    const categories = getArticleNewsCategories();
    if (getArticleNewsArticles().length) {
      return categories;
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
