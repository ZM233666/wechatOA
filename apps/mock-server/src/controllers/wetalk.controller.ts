import { wetalkBooks, WetalkBookError } from '../services/wetalk-book.service';
import type { NextFunction, Request, Response } from 'express';
import { mockEnv } from '../config/env';
import { HttpError } from '../middleware/error-handler.middleware';
import { readWetalkMini, WetalkMiniError, type WetalkResource } from '../services/wetalk-mini.client';
import { enrichWetalkMiniPayload } from '../services/wetalk-payload.service';
import { success } from '../utils/response';

function positiveInteger(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(Math.floor(parsed), max) : fallback;
}
function handler(resource: WetalkResource, detail = false) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = typeof req.query.loginCode === 'string' ? req.query.loginCode : req.get('X-Login-Code');
      const data = await readWetalkMini({
        baseUrl: mockEnv.NEWS_ARTICLE_API_BASE_URL, resource,
        id: detail ? String(req.params.id) : undefined,
        page: positiveInteger(req.query.page, 1), limit: positiveInteger(req.query.limit, 50, 100),
        loginCode: code || undefined,
      });
      res.setHeader('Cache-Control', 'no-store');
      success(res, enrichWetalkMiniPayload(req, data, resource), req.requestId);
    } catch (error) {
      next(error instanceof WetalkMiniError
        ? new HttpError(error.status, error.message, 'WETALK_MINI_ERROR') : error);
    }
  };
}
export const getWetalkNewsListMini = handler('news');
export const getWetalkNewsDetailMini = handler('news', true);
export const getWetalkEmagazineList = handler('emagazines');
export const getWetalkEmagazineDetail = handler('emagazines', true);


function bookHandler(image: boolean) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resource = String(req.params.resource);
      if (resource !== 'news' && resource !== 'emagazines') throw new WetalkBookError(404, '刊物类型不存在');
      const id = String(req.params.id);
      const code = typeof req.query.loginCode === 'string' ? req.query.loginCode : req.get('X-Login-Code');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (image) {
        const file = await wetalkBooks.page(resource, id, String(req.params.version), Number(req.params.page), code);
        res.type('png').sendFile(file, error => { if (error) next(error); });
      } else success(res, await wetalkBooks.manifest(resource, id, code), req.requestId);
    } catch (error) {
      next(error instanceof WetalkBookError || error instanceof WetalkMiniError
        ? new HttpError(error.status, error.message, 'WETALK_READER_ERROR') : error);
    }
  };
}
export const getWetalkReader = bookHandler(false);
export const getWetalkReaderPage = bookHandler(true);

/** PDF 列表/杂志封面：复用阅读器第 1 页（image 无法带 header，支持 loginCode 查询参数） */
export async function getWetalkCover(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resource = String(req.params.resource);
    if (resource !== 'news' && resource !== 'emagazines') throw new WetalkBookError(404, '刊物类型不存在');
    const id = String(req.params.id);
    const code = typeof req.query.loginCode === 'string' ? req.query.loginCode : req.get('X-Login-Code');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const file = await wetalkBooks.cover(resource as WetalkResource, id, code);
    res.type('png').sendFile(file, error => { if (error) next(error); });
  } catch (error) {
    next(error instanceof WetalkBookError || error instanceof WetalkMiniError
      ? new HttpError(error.status, error.message, 'WETALK_COVER_ERROR') : error);
  }
}