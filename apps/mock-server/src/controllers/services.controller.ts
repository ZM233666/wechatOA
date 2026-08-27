import { ERROR_CODES } from '@app/shared';
import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import {
  getFixtures,
  refreshInsightReportFromDisk,
  syncPdfDrivenCatalogs,
} from '../services/fixture.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { success } from '../utils/response';

export function getServices(req: Request, res: Response): void {
  syncPdfDrivenCatalogs();
  const { heroCards, insightCovers } = getFixtures().services;
  if (req.mockScenario === 'empty') {
    success(res, { heroCards: [], insightCovers: [] }, req.requestId);
    return;
  }

  const reportsById = new Map(getFixtures().insightReports.map((item) => [item.id, item]));
  // 首页 KB Insights 仅展示最新 2 条（sync 已按 PDF 时间排序封面）
  const enrichedCovers = insightCovers.slice(0, 2).map((cover) => {
    const report = reportsById.get(cover.id);
    if (!report) {
      return cover;
    }
    return {
      ...cover,
      coverImage: report.coverImage ?? cover.coverImage,
      pdfUrl: report.pdfUrl,
      tag: cover.tag ?? report.tag ?? (report.pdfUrl ? 'PDF' : undefined),
    };
  });

  success(res, withAbsoluteAssets(req, { heroCards, insightCovers: enrichedCovers }), req.requestId);
}

export function getInsightReports(req: Request, res: Response): void {
  syncPdfDrivenCatalogs();
  const items = getFixtures().insightReports.map(({ pages: _pages, ...summary }) => summary);
  if (req.mockScenario === 'empty') {
    success(res, { items: [] }, req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, { items }), req.requestId);
}

export function getInsightReportDetail(req: Request, res: Response): void {
  const id = String(req.params.id);
  const report =
    refreshInsightReportFromDisk(id) ??
    getFixtures().insightReports.find((item) => item.id === id);
  if (!report) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id,
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
