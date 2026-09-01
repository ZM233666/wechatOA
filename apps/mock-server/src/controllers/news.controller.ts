import { ERROR_CODES } from '@app/shared';
import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import {
  isDevDraftPreview,
  isPubliclyVisible,
  listPublicNews,
  matchesNewsKeyword,
  toNewsDetail,
  toNewsSummary,
} from '../services/news.service';
import type { NewsArticleFixture } from '../schemas/news.schema';
import {
  findNewsArticle,
  getNewsArticlesForRequest,
  getNewsCategoriesForRequest,
} from '../services/news-source.service';
import { emptyPage, paginate } from '../services/pagination.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { parseOptionalBoolean, parseOptionalString, parsePaginationQuery } from '../utils/query';
import { success } from '../utils/response';

export function getNewsCategories(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    success(res, { items: [] }, req.requestId);
    return;
  }
  const articles = getNewsArticlesForRequest();
  const publicNews = listPublicNews(articles);
  const counts = new Map<string, number>();
  publicNews.forEach((article) => {
    counts.set(article.category.id, (counts.get(article.category.id) ?? 0) + 1);
  });
  const items = [
    { id: 'all', name: '全部', articleCount: publicNews.length },
    ...getNewsCategoriesForRequest().map((category) => ({
      ...category,
      articleCount: counts.get(category.id) ?? 0,
    })),
  ];
  success(res, { items }, req.requestId);
}

export function getNewsList(req: Request, res: Response): void {
  const { page, pageSize } = parsePaginationQuery(req.query as Record<string, unknown>);
  if (req.mockScenario === 'empty') {
    success(res, emptyPage(page, pageSize), req.requestId);
    return;
  }
  const category = parseOptionalString(req.query.category);
  const keyword = parseOptionalString(req.query.keyword);
  const featured = parseOptionalBoolean(req.query.featured);
  const pinned = parseOptionalBoolean(req.query.pinned);
  const filtered = listPublicNews(getNewsArticlesForRequest()).filter((item) => {
    if (category && category !== 'all' && item.category.id !== category) {
      return false;
    }
    if (featured !== undefined && item.placement.featured !== featured) {
      return false;
    }
    if (pinned !== undefined && item.placement.pinned !== pinned) {
      return false;
    }
    return matchesNewsKeyword(item, keyword);
  });
  const summaries = filtered.map(toNewsSummary);
  success(res, withAbsoluteAssets(req, paginate(summaries, page, pageSize)), req.requestId);
}

export function getNewsDetail(req: Request, res: Response): void {
  const idOrSlug = String(req.params.id);
  const articles = getNewsArticlesForRequest();
  const article = findNewsArticle(articles, idOrSlug);
  if (!article || (!isPubliclyVisible(article) && !isDevDraftPreview(article))) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id: idOrSlug,
    });
  }
  const related: NewsArticleFixture[] = [];
  for (const relatedId of article.relatedArticleIds) {
    const found = findNewsArticle(articles, relatedId);
    if (found && isPubliclyVisible(found)) {
      related.push(found);
    }
  }
  // 无显式关联时，用同分类其他公开文章补齐
  if (!related.length) {
    for (const candidate of listPublicNews(articles)) {
      if (candidate.id === article.id) {
        continue;
      }
      if (candidate.category.id === article.category.id) {
        related.push(candidate);
      }
      if (related.length >= 3) {
        break;
      }
    }
  }
  success(res, withAbsoluteAssets(req, toNewsDetail(article, related)), req.requestId);
}
