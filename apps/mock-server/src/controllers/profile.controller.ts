import type { Request, Response } from 'express';
import type { ProfileData, ProfileRoleKey } from '@app/shared';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
import { success } from '../utils/response';

function resolveRoleKey(value: unknown): ProfileRoleKey | null {
  if (value === 'Edward' || value === 'Customer' || value === 'Visitor') {
    return value;
  }
  return null;
}

function pickProfileFixture(req: Request): ProfileData {
  const fixtures = getFixtures();
  const role = resolveRoleKey(req.query.role);

  if (role === 'Visitor') {
    return fixtures.profileGuest;
  }
  if (role === 'Customer') {
    return fixtures.profileCustomer;
  }
  if (role === 'Edward') {
    return fixtures.profileLoggedIn;
  }

  // Mock-only 兼容：loggedIn 仅用于切换夹具，不得进入正式 NestJS API。
  const loggedIn = req.query.loggedIn === 'true' || req.query.loggedIn === '1';
  return loggedIn ? fixtures.profileLoggedIn : fixtures.profileGuest;
}

export function getProfile(req: Request, res: Response): void {
  const data = pickProfileFixture(req);
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
