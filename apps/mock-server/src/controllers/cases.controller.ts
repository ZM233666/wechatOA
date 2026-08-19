import { ERROR_CODES } from '@app/shared';
import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
import { emptyPage, paginate } from '../services/pagination.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { matchesKeyword, parseOptionalString, parsePaginationQuery } from '../utils/query';
import { success } from '../utils/response';

export function getCaseCategories(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    success(res, [], req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, getFixtures().caseCategories), req.requestId);
}

export function getCases(req: Request, res: Response): void {
  const { page, pageSize } = parsePaginationQuery(req.query as Record<string, unknown>);
  if (req.mockScenario === 'empty') {
    success(res, emptyPage(page, pageSize), req.requestId);
    return;
  }
  const category = parseOptionalString(req.query.category);
  const keyword = parseOptionalString(req.query.keyword);
  const filtered = getFixtures().cases.filter((item) => {
    if (category && item.category.id !== category) {
      return false;
    }
    return matchesKeyword(`${item.title} ${item.summary} ${item.region} ${item.industry}`, keyword);
  });
  success(res, withAbsoluteAssets(req, paginate(filtered, page, pageSize)), req.requestId);
}

export function getCaseDetail(req: Request, res: Response): void {
  const detail = getFixtures().caseDetails.find((item) => item.id === req.params.id);
  if (!detail) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id: req.params.id,
    });
  }
  success(res, withAbsoluteAssets(req, detail), req.requestId);
}
