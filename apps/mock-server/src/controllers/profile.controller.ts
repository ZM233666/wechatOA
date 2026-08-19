import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
import { success } from '../utils/response';

export function getProfile(req: Request, res: Response): void {
  // Mock-only: loggedIn 仅用于切换夹具，不得进入正式 NestJS API。
  const loggedIn = req.query.loggedIn === 'true' || req.query.loggedIn === '1';
  const data = loggedIn ? getFixtures().profileLoggedIn : getFixtures().profileGuest;
  if (req.mockScenario === 'empty') {
    success(
      res,
      withAbsoluteAssets(req, {
        ...data,
        fields: [],
      }),
      req.requestId,
    );
    return;
  }
  success(res, withAbsoluteAssets(req, data), req.requestId);
}
