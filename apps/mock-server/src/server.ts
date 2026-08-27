import { createApp } from './app';
import { mockEnv } from './config/env';
import { assertFixtureIntegrity, loadFixtures } from './services/fixture.service';
import {
  getAllMinioPdfStatuses,
  isMinioPdfEnabled,
  syncAllPdfCatalogsFromMinio,
} from './services/minio-pdf.service';
import { isArticleNewsEnabled } from './services/article-content.client';
import { getArticleNewsStatus, syncArticleNews } from './services/article-news.service';
import { logError, logInfo, logWarn } from './utils/logger';

async function bootstrap(): Promise<void> {
  if (isMinioPdfEnabled()) {
    logInfo('Syncing PDF catalogs from MinIO before boot', {
      endpoint: `${mockEnv.MINIO_ENDPOINT}:${mockEnv.MINIO_PORT}`,
      bucket: mockEnv.MINIO_BUCKET,
      insightsPrefix: mockEnv.MINIO_INSIGHTS_PREFIX,
      wetalkPrefix: mockEnv.MINIO_WETALK_PREFIX,
      suzhouCampusMapPrefix: mockEnv.MINIO_SUZHOU_CAMPUS_MAP_PREFIX,
      suzhouShuttleBusPrefix: mockEnv.MINIO_SUZHOU_SHUTTLE_BUS_PREFIX,
    });
    await syncAllPdfCatalogsFromMinio({ force: true });
    for (const status of getAllMinioPdfStatuses()) {
      if (status.lastError) {
        logWarn('MinIO PDF sync reported error; continuing with local fixtures/cache', {
          catalog: status.id,
          cacheDir: status.cacheDir,
          message: status.lastError,
        });
      }
    }
  }

  if (isArticleNewsEnabled()) {
    logInfo('Syncing news from article-content before boot', {
      base: mockEnv.NEWS_ARTICLE_API_BASE_URL,
      includeDrafts: mockEnv.NEWS_ARTICLE_INCLUDE_DRAFTS,
    });
    await syncArticleNews({ force: true });
    const status = getArticleNewsStatus();
    if (status.lastError) {
      logWarn('Article news sync reported error; news APIs will fall back to fixtures until cache fills', {
        message: status.lastError,
      });
    } else {
      logInfo('Article news ready', { count: status.count });
    }
  }

  try {
    const fixtures = loadFixtures();
    assertFixtureIntegrity(fixtures);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown fixture error';
    logError(message);
    process.exit(1);
  }

  const app = createApp();
  app.listen(mockEnv.MOCK_PORT, mockEnv.MOCK_HOST, () => {
    logInfo(`Mock API Server listening on http://${mockEnv.MOCK_HOST}:${mockEnv.MOCK_PORT}`);
    logInfo(`Health check: http://127.0.0.1:${mockEnv.MOCK_PORT}${mockEnv.API_PREFIX}/health`);
    logInfo(`Static assets: http://127.0.0.1:${mockEnv.MOCK_PORT}/mock-assets/`);
  });
}

void bootstrap();
