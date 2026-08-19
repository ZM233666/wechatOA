import { ERROR_CODES } from '@app/shared';
import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
import {
  isPubliclyVisible,
  listPublicNews,
  matchesNewsKeyword,
  toNewsDetail,
  toNewsSummary,
} from '../services/news.service';
import type { NewsArticleFixture } from '../schemas/news.schema';
import { emptyPage, paginate } from '../services/pagination.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { parseOptionalBoolean, parseOptionalString, parsePaginationQuery } from '../utils/query';
import { success } from '../utils/response';

export function getNewsCategories(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    success(res, { items: [] }, req.requestId);
    return;
  }
  const publicNews = listPublicNews(getFixtures().newsArticles);
  const counts = new Map<string, number>();
  publicNews.forEach((article) => {
    counts.set(article.category.id, (counts.get(article.category.id) ?? 0) + 1);
  });
  const items = [
    { id: 'all', name: '全部', articleCount: publicNews.length },
    ...getFixtures().newsCategories.map((category) => ({
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
  const filtered = listPublicNews(getFixtures().newsArticles).filter((item) => {
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
  const idOrSlug = req.params.id;
  const article = getFixtures().newsArticles.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
  if (!article || !isPubliclyVisible(article)) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id: idOrSlug,
    });
  }
  const related: NewsArticleFixture[] = [];
  for (const relatedId of article.relatedArticleIds) {
    const found = getFixtures().newsArticles.find((item) => item.id === relatedId);
    if (found && isPubliclyVisible(found)) {
      related.push(found);
    }
  }
  success(res, withAbsoluteAssets(req, toNewsDetail(article, related)), req.requestId);
}
