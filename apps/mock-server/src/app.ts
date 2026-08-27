import cors from 'cors';
import express, { type Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { mockEnv } from './config/env';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { scenarioMiddleware } from './middleware/scenario.middleware';
import { delayMiddleware } from './middleware/delay.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { createApiRouter } from './routes';
import { FIXTURES_DIR, PUBLIC_DIR } from './services/fixture.service';
import { NEWS_MEDIA_DIR } from './services/html-to-rich-content';
import {
  INSIGHT_LOCAL_PDF_DIR,
  INSIGHT_MINIO_CACHE_DIR,
  resolveInsightPdfAbsolute,
  resolveSuzhouCampusMapPdfAbsolute,
  resolveWetalkPdfAbsolute,
  SUZHOU_MINIO_LOCATION,
  WETALK_LOCAL_PDF_DIR,
  WETALK_MINIO_CACHE_DIR,
} from './services/minio-pdf.service';

function serveResolvedPdf(
  resolveAbsolute: (fileName: string) => string | null,
): express.RequestHandler {
  return (req, res, next) => {
    const fileName = decodeURIComponent(req.path.replace(/^\//, ''));
    if (!fileName || fileName.includes('..')) {
      next();
      return;
    }
    const absolute = resolveAbsolute(fileName);
    if (!absolute || !fs.existsSync(absolute)) {
      next();
      return;
    }
    res.sendFile(absolute);
  };
}

export function createApp(): Express {
  const app = express();
  const corsOrigins =
    mockEnv.CORS_ORIGINS === '*'
      ? '*'
      : mockEnv.CORS_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean);

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(
    cors({
      origin: corsOrigins,
    }),
  );
  // KB Insights / WeTalk PDF：优先 MinIO runtime 缓存，其次本地 fixtures
  app.use('/mock-assets/services/insights/files', serveResolvedPdf(resolveInsightPdfAbsolute));
  app.use('/mock-assets/services/insights/files', express.static(INSIGHT_MINIO_CACHE_DIR));
  app.use('/mock-assets/services/insights/files', express.static(INSIGHT_LOCAL_PDF_DIR));
  app.use('/mock-assets/kb-life/wetalk/files', serveResolvedPdf(resolveWetalkPdfAbsolute));
  app.use('/mock-assets/kb-life/wetalk/files', express.static(WETALK_MINIO_CACHE_DIR));
  app.use('/mock-assets/kb-life/wetalk/files', express.static(WETALK_LOCAL_PDF_DIR));
  // 园区地图 PDF：Suzhou 走 MinIO 缓存；其他地点仍映射 fixtures/.../Map/
  app.use('/mock-assets/kb-life/campus-maps/files', (req, res, next) => {
    const parts = req.path.replace(/^\//, '').split('/').filter(Boolean);
    if (parts.length < 2) {
      next();
      return;
    }
    const location = decodeURIComponent(parts[0] ?? '');
    const fileName = decodeURIComponent(parts.slice(1).join('/'));
    if (!fileName || fileName.includes('..')) {
      next();
      return;
    }
    const absolute =
      location === SUZHOU_MINIO_LOCATION
        ? resolveSuzhouCampusMapPdfAbsolute(fileName)
        : path.join(FIXTURES_DIR, 'kb-life/locations', location, 'Map', fileName);
    if (!absolute || !fs.existsSync(absolute)) {
      next();
      return;
    }
    res.sendFile(absolute);
  });
  app.use('/mock-assets/news/runtime', express.static(NEWS_MEDIA_DIR));
  app.use('/mock-assets', express.static(path.join(PUBLIC_DIR, 'mock-assets')));
  app.use(requestIdMiddleware);
  app.use(mockEnv.API_PREFIX, scenarioMiddleware, delayMiddleware, createApiRouter());
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);
  return app;
}
