import { ERROR_CODES } from '@app/shared';
import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { success } from '../utils/response';

export function getServices(req: Request, res: Response): void {
  const { heroCards, insightCovers } = getFixtures().services;
  if (req.mockScenario === 'empty') {
    success(res, { heroCards: [], insightCovers: [] }, req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, { heroCards, insightCovers }), req.requestId);
}

export function getInsightReports(req: Request, res: Response): void {
  const items = getFixtures().insightReports.map(({ pages: _pages, ...summary }) => summary);
  if (req.mockScenario === 'empty') {
    success(res, { items: [] }, req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, { items }), req.requestId);
}

export function getInsightReportDetail(req: Request, res: Response): void {
  const report = getFixtures().insightReports.find((item) => item.id === req.params.id);
  if (!report) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id: req.params.id,
    });
  }
  success(res, withAbsoluteAssets(req, report), req.requestId);
}

export function getServiceDetail(req: Request, res: Response): void {
  const detail = getFixtures().services.details.find((item) => item.id === req.params.id);
  if (!detail) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id: req.params.id,
    });
  }
  success(res, withAbsoluteAssets(req, detail), req.requestId);
}
