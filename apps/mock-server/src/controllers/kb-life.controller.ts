import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
import { success } from '../utils/response';

export function getKbLifeEntries(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    const empty = {
      banners: [],
      locations: getFixtures().kbLifeEntries.locations,
      campusServices: [],
      employeeServices: [],
    };
    success(res, withAbsoluteAssets(req, empty), req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, getFixtures().kbLifeEntries), req.requestId);
}

export function getCanteen(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    success(res, withAbsoluteAssets(req, { intro: getFixtures().canteen.intro, menuItems: [] }), req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, getFixtures().canteen), req.requestId);
}

export function getShuttle(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    success(res, withAbsoluteAssets(req, { notice: getFixtures().shuttle.notice, routes: [] }), req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, getFixtures().shuttle), req.requestId);
}

export function getActivities(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    success(
      res,
      withAbsoluteAssets(req, {
        ...getFixtures().activities,
        items: [],
        outings: [],
      }),
      req.requestId,
    );
    return;
  }
  success(res, withAbsoluteAssets(req, getFixtures().activities), req.requestId);
}
