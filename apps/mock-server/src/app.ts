import cors from 'cors';
import express, { type Express } from 'express';
import path from 'node:path';
import { mockEnv } from './config/env';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { scenarioMiddleware } from './middleware/scenario.middleware';
import { delayMiddleware } from './middleware/delay.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { createApiRouter } from './routes';
import { PUBLIC_DIR } from './services/fixture.service';

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
  app.use('/mock-assets', express.static(path.join(PUBLIC_DIR, 'mock-assets')));
  app.use(requestIdMiddleware);
  app.use(mockEnv.API_PREFIX, scenarioMiddleware, delayMiddleware, createApiRouter());
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);
  return app;
}
