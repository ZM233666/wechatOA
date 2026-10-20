import type { Request } from 'express';
import { ERROR_CODES } from '@app/shared';
import { HttpError } from '../middleware/error-handler.middleware';
import { getIdentityBindingStatus } from './identity-binding.service';

export type IdentityAccessTier = 'visitor' | 'customer' | 'employee';

export function readLoginCodeFromRequest(req: Request): string {
  return String(req.query.loginCode ?? '').trim();
}

export function getIdentityAccessTierFromLoginCode(loginCode: string): IdentityAccessTier {
  if (!loginCode) {
    return 'visitor';
  }
  const status = getIdentityBindingStatus(loginCode);
  if (!status.bound || !status.binding) {
    return 'visitor';
  }
  const role = status.binding.roleLabel.trim().toLowerCase();
  if (role === 'employee') {
    return 'employee';
  }
  if (role === 'customer') {
    return 'customer';
  }
  return 'visitor';
}

/** 已绑定（Employee 或 Customer） */
export function requireBoundIdentity(req: Request): void {
  const tier = getIdentityAccessTierFromLoginCode(readLoginCodeFromRequest(req));
  if (tier === 'visitor') {
    throw new HttpError(
      403,
      '请先完成身份绑定',
      ERROR_CODES.UNAUTHORIZED,
      { reason: 'IDENTITY_BINDING_REQUIRED' },
    );
  }
}

/** 仅 Employee 身份（WeTalk、员工手册等） */
export function requireEmployeeIdentity(req: Request): void {
  const tier = getIdentityAccessTierFromLoginCode(readLoginCodeFromRequest(req));
  if (tier !== 'employee') {
    throw new HttpError(
      403,
      '此功能仅面向 KB 员工',
      ERROR_CODES.UNAUTHORIZED,
      { reason: 'EMPLOYEE_IDENTITY_REQUIRED' },
    );
  }
}

/** 指导文件（列表 / 员工手册 / 财务手册）：公开可读，不校验身份 */
export function requireGuidanceDocumentsIdentity(_req: Request): void {
  return;
}
