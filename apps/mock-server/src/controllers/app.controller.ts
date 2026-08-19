import type { Request, Response } from 'express';
import { getFixtures } from '../services/fixture.service';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { success } from '../utils/response';

export function getHealth(req: Request, res: Response): void {
  success(
    res,
    {
      status: 'ok' as const,
      service: 'mock-server',
      mode: 'mock',
      version: '1.0.0',
    },
    req.requestId,
  );
}

export function getAppConfig(req: Request, res: Response): void {
  const data = withAbsoluteAssets(req, getFixtures().appConfig);
  success(res, data, req.requestId);
}
