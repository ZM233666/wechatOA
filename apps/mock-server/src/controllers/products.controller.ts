import { ERROR_CODES } from '@app/shared';
import type { NextFunction, Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { emptyPage, paginate } from '../services/pagination.service';
import {
  getAllProductSummariesForRequest,
  getProductCategoriesForRequest,
  getProductDetailForRequest,
} from '../services/product-source.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { matchesProductCategoryFilter } from '../services/product-intro.client';
import { matchesKeyword, parseOptionalString, parsePaginationQuery } from '../utils/query';
import { success } from '../utils/response';

export async function getProductCategories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.mockScenario === 'empty') {
      success(res, withAbsoluteAssets(req, { slides: [], categories: [] }), req.requestId);
      return;
    }
    const categories = await getProductCategoriesForRequest();
    success(res, withAbsoluteAssets(req, categories), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, pageSize } = parsePaginationQuery(req.query as Record<string, unknown>);
    if (req.mockScenario === 'empty') {
      success(res, emptyPage(page, pageSize), req.requestId);
      return;
    }
    const category = parseOptionalString(req.query.category);
    const keyword = parseOptionalString(req.query.keyword);
    const allProducts = await getAllProductSummariesForRequest();
    const filtered = allProducts.filter((item) => {
      if (category && !matchesProductCategoryFilter(item.category.id, category)) {
        return false;
      }
      return matchesKeyword(
        `${item.name} ${item.nameCn} ${item.summary} ${item.category.name}`,
        keyword,
      );
    });
    success(res, withAbsoluteAssets(req, paginate(filtered, page, pageSize)), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getProductDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = String(req.params.id);
    const detail = await getProductDetailForRequest(id);
    if (!detail) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
        id,
      });
    }
    success(res, withAbsoluteAssets(req, detail), req.requestId);
  } catch (error) {
    next(error);
  }
}
