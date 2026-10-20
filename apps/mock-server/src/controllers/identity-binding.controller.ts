import { ERROR_CODES } from '@app/shared';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../middleware/error-handler.middleware';
import { identityBindingSubmitSchema } from '../schemas/identity-binding.schema';
import {
  bindIdentityByEmail,
  getIdentityBindingStatus,
} from '../services/identity-binding.service';
import { success } from '../utils/response';

export function getIdentityBinding(req: Request, res: Response, next: NextFunction): void {
  try {
    const loginCode = String(req.query.loginCode ?? '').trim();
    if (!loginCode) {
      throw new HttpError(400, '缺少 loginCode', ERROR_CODES.VALIDATION_ERROR, {
        field: 'loginCode',
      });
    }
    const status = getIdentityBindingStatus(loginCode);
    success(res, status, req.requestId);
  } catch (error) {
    next(error);
  }
}

export function postIdentityBinding(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = identityBindingSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, '请求参数无效', ERROR_CODES.VALIDATION_ERROR, {
        issues: parsed.error.issues,
      });
    }
    const { companyEmail, loginCode } = parsed.data;
    try {
      const binding = bindIdentityByEmail(companyEmail, loginCode);
      success(
        res,
        {
          bound: true,
          binding,
        },
        req.requestId,
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'IDENTITY_EMAIL_NOT_ALLOWED') {
        throw new HttpError(
          400,
          '该邮箱未在企业授权范围内，请使用公司邮箱或联系管理员',
          ERROR_CODES.VALIDATION_ERROR,
          { companyEmail: companyEmail.trim().toLowerCase() },
        );
      }
      if (error instanceof Error && error.message === 'IDENTITY_ALREADY_BOUND') {
        throw new HttpError(
          409,
          '当前微信已绑定其他邮箱',
          ERROR_CODES.VALIDATION_ERROR,
          (error as Error & { details?: Record<string, unknown> }).details ?? null,
        );
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
}
