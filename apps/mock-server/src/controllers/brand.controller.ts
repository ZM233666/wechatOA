import { ERROR_CODES } from '@app/shared';
import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
import { emptyPage, paginate } from '../services/pagination.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { matchesKeyword, parseOptionalString, parsePaginationQuery } from '../utils/query';
import { success } from '../utils/response';

export function getBrand(req: Request, res: Response): void {
  success(res, withAbsoluteAssets(req, getFixtures().brand), req.requestId);
}

export function getBrandArticles(req: Request, res: Response): void {
  const { page, pageSize } = parsePaginationQuery(req.query as Record<string, unknown>);
  if (req.mockScenario === 'empty') {
    success(res, emptyPage(page, pageSize), req.requestId);
    return;
  }
  const keyword = parseOptionalString(req.query.keyword);
  const filtered = getFixtures().brandArticles.filter((item) =>
    matchesKeyword(`${item.title} ${item.summary} ${item.tags.join(' ')}`, keyword),
  );
  const summaries = filtered.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    category: item.category,
    publishedAt: item.publishedAt,
    coverImage: item.coverImage,
    featured: true,
    tags: item.tags,
  }));
  success(res, withAbsoluteAssets(req, paginate(summaries, page, pageSize)), req.requestId);
}

export function getBrandArticleDetail(req: Request, res: Response): void {
  const article = getFixtures().brandArticles.find((item) => item.id === req.params.id);
  if (!article) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id: req.params.id,
    });
  }
  success(res, withAbsoluteAssets(req, article), req.requestId);
}
