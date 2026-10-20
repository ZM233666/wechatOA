import type { Request, Response } from 'express';
import type { ProfileData } from '@app/shared';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
import { getIdentityBindingStatus } from '../services/identity-binding.service';
import { success } from '../utils/response';

function pickProfileFixtureByBinding(loginCode: string): ProfileData {
  const fixtures = getFixtures();
  const status = getIdentityBindingStatus(loginCode);
  if (!status.bound || !status.binding) {
    return fixtures.profileGuest;
  }
  const roleLabel = status.binding.roleLabel.trim().toLowerCase();
  if (roleLabel === 'employee') {
    return fixtures.profileLoggedIn;
  }
  if (roleLabel === 'customer') {
    return fixtures.profileCustomer;
  }
  return fixtures.profileGuest;
}

function pickProfileFixture(req: Request): ProfileData {
  const loginCode = String(req.query.loginCode ?? '').trim();
  if (loginCode) {
    return pickProfileFixtureByBinding(loginCode);
  }
  return getFixtures().profileGuest;
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
