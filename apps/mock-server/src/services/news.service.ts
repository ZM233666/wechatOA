import type { HomeBanner, NewsDetail, NewsSummary } from '@app/shared';
import type { NewsArticleFixture } from '../schemas/news.schema';
import { getMockNow } from '../utils/clock';

const HOME_NEWS_LIMIT = 3;
const HOME_BANNER_LIMIT = 5;

export function isPubliclyVisible(article: NewsArticleFixture, at: Date = getMockNow()): boolean {
  if (article.status !== 'published' || !article.publishedAt) {
    return false;
  }
  return Date.parse(article.publishedAt) <= at.getTime();
}

export function comparePublicNews(a: NewsArticleFixture, b: NewsArticleFixture): number {
  if (a.placement.pinned !== b.placement.pinned) {
    return a.placement.pinned ? -1 : 1;
  }
  if (a.placement.sortOrder !== b.placement.sortOrder) {
    return b.placement.sortOrder - a.placement.sortOrder;
  }
  const publishedDiff = Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? '');
  if (publishedDiff !== 0) {
    return publishedDiff;
  }
  return a.id.localeCompare(b.id);
}

export function toNewsSummary(article: NewsArticleFixture): NewsSummary {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    summary: article.summary,
    category: article.category,
    publishedAt: article.publishedAt ?? article.updatedAt,
    coverImage: article.coverImage,
    thumbnailImage: article.thumbnailImage ?? article.coverImage,
    featured: article.placement.featured,
    pinned: article.placement.pinned,
    tags: article.tags,
  };
}

export function listPublicNews(articles: NewsArticleFixture[], at: Date = getMockNow()): NewsArticleFixture[] {
  return articles.filter((item) => isPubliclyVisible(item, at)).sort(comparePublicNews);
}

export function selectHomeNews(articles: NewsArticleFixture[], at: Date = getMockNow()): NewsSummary[] {
  return listPublicNews(articles, at)
    .filter((item) => item.placement.showOnHome)
    .slice(0, HOME_NEWS_LIMIT)
    .map(toNewsSummary);
}

export function selectHomeBanners(articles: NewsArticleFixture[], at: Date = getMockNow()): HomeBanner[] {
  return listPublicNews(articles, at)
    .filter((item) => item.placement.showOnBanner)
    .slice(0, HOME_BANNER_LIMIT)
    .map((article) => ({
      id: article.id,
      title: article.title,
      description: article.subtitle || article.summary,
      image: article.coverImage,
      targetUrl: `/pages/news/detail?id=${article.id}`,
      newsId: article.id,
    }));
}

export function toNewsDetail(
  article: NewsArticleFixture,
  related: NewsArticleFixture[],
): NewsDetail {
  return {
    ...toNewsSummary(article),
    author: article.author,
    source: article.source,
    richContent: article.richContent,
    relatedArticles: related
      .filter((item) => item.id !== article.id)
      .slice(0, 3)
      .map(toNewsSummary),
    share: article.share,
  };
}

export function matchesNewsKeyword(article: NewsArticleFixture, keyword?: string): boolean {
  if (!keyword) {
    return true;
  }
  const haystack = [
    article.title,
    article.subtitle,
    article.summary,
    ...article.tags.map((tag) => tag.name),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}
