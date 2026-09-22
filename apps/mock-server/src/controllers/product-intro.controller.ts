import { ERROR_CODES } from '@app/shared';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../middleware/error-handler.middleware';
import {
  getProductIntroDetailForRequest,
  getProductIntroListForRequest,
} from '../services/product-intro.service';
import {
  isProductIntroSystem,
  PRODUCT_INTRO_SYSTEM_META,
} from '../services/product-intro.types';
import { matchesKeyword, parseOptionalBoolean, parseOptionalString } from '../utils/query';
import { success } from '../utils/response';

function absolutizeCoverUrl(req: Request, coverUrl: string): string {
  if (!coverUrl) {
    return '';
  }
  if (/^https?:\/\//i.test(coverUrl)) {
    return coverUrl;
  }
  const base = `${req.protocol}://${req.get('host')}`;
  return coverUrl.startsWith('/') ? `${base}${coverUrl}` : `${base}/${coverUrl}`;
}

function mapCoverUrls<T extends { coverUrl: string }>(req: Request, items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    coverUrl: absolutizeCoverUrl(req, item.coverUrl),
  }));
}

export function getProductIntroSystems(req: Request, res: Response): void {
  success(res, { systems: PRODUCT_INTRO_SYSTEM_META }, req.requestId);
}

export async function getProductIntroList(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const system = String(req.params.system);
    if (!isProductIntroSystem(system)) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { system });
    }
    if (req.mockScenario === 'empty') {
      success(res, { items: [] }, req.requestId);
      return;
    }

    const category = parseOptionalString(req.query.category);
    const isCoreProduct = parseOptionalBoolean(req.query.is_core_product);
    const keyword = parseOptionalString(req.query.keyword);
    let items = await getProductIntroListForRequest(system, { category, isCoreProduct });
    if (keyword) {
      items = items.filter((item) =>
        matchesKeyword(
          `${item.productName} ${item.productNo} ${item.summary} ${item.category}`,
          keyword,
        ),
      );
    }
    success(res, { items: mapCoverUrls(req, items) }, req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getProductIntroDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const system = String(req.params.system);
    const id = String(req.params.id);
    if (!isProductIntroSystem(system)) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { system });
    }
    if (req.mockScenario === 'empty' || req.mockScenario === 'not-found') {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { system, id });
    }

    const detail = await getProductIntroDetailForRequest(system, id);
    if (!detail) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { system, id });
    }
    success(
      res,
      {
        ...detail,
        coverUrl: absolutizeCoverUrl(req, detail.coverUrl),
      },
      req.requestId,
    );
  } catch (error) {
    next(error);
  }
}
