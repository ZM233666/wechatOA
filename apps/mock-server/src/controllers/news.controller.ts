import { ERROR_CODES } from '@app/shared';
import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
import { emptyPage, paginate } from '../services/pagination.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { matchesKeyword, parseOptionalBoolean, parseOptionalString, parsePaginationQuery } from '../utils/query';
import { success } from '../utils/response';

export function getNewsCategories(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    success(res, [], req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, getFixtures().newsCategories), req.requestId);
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
  const filtered = getFixtures().newsList.filter((item) => {
    if (category && item.category.id !== category) {
      return false;
    }
    if (featured !== undefined && item.featured !== featured) {
      return false;
    }
    const haystack = `${item.title} ${item.summary} ${item.tags.join(' ')}`;
    return matchesKeyword(haystack, keyword);
  });
  success(res, withAbsoluteAssets(req, paginate(filtered, page, pageSize)), req.requestId);
}

export function getNewsDetail(req: Request, res: Response): void {
  const article = getFixtures().newsArticles.find((item) => item.id === req.params.id);
  if (!article) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id: req.params.id,
    });
  }
  success(res, withAbsoluteAssets(req, article), req.requestId);
}
