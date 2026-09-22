import { ERROR_CODES } from '@app/shared';
import type { NextFunction, Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import {
  getCaseCategoriesForRequest,
  getCaseDetailForRequest,
  getCasesForRequest,
} from '../services/case-source.service';
import { emptyPage, paginate } from '../services/pagination.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { matchesKeyword, parseOptionalString, parsePaginationQuery } from '../utils/query';
import { success } from '../utils/response';

export async function getCaseCategories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.mockScenario === 'empty') {
      success(res, [], req.requestId);
      return;
    }
    const categories = await getCaseCategoriesForRequest();
    success(res, withAbsoluteAssets(req, categories), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getCases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, pageSize } = parsePaginationQuery(req.query as Record<string, unknown>);
    if (req.mockScenario === 'empty') {
      success(res, emptyPage(page, pageSize), req.requestId);
      return;
    }
    const category = parseOptionalString(req.query.category);
    const keyword = parseOptionalString(req.query.keyword);
    const filtered = (await getCasesForRequest()).filter((item) => {
      if (category && item.category.id !== category) {
        return false;
      }
      return matchesKeyword(`${item.title} ${item.summary} ${item.region} ${item.industry}`, keyword);
    });
    success(res, withAbsoluteAssets(req, paginate(filtered, page, pageSize)), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getCaseDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const detail = await getCaseDetailForRequest(req.params.id);
    if (!detail) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
        id: req.params.id,
      });
    }
    success(res, withAbsoluteAssets(req, detail), req.requestId);
  } catch (error) {
    next(error);
  }
}
