import type { Request, Response } from 'express';
import { getFixtures } from '../services/fixture.service';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { success } from '../utils/response';

export function getHome(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    const emptyHome = {
      ...getFixtures().home,
      banners: [],
      quickEntries: [],
      recommendedProducts: [],
      recommendedCases: [],
      latestNews: [],
      serviceEntries: [],
    };
    success(res, withAbsoluteAssets(req, emptyHome), req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, getFixtures().home), req.requestId);
}
