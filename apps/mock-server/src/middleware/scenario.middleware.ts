import { ERROR_CODES } from '@app/shared';
import type { NextFunction, Request, Response } from 'express';
import { resolveScenario, shouldShortCircuitScenario } from '../services/scenario.service';
import { failure } from '../utils/response';

export function scenarioMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.mockScenario = resolveScenario(req);
  if (!shouldShortCircuitScenario(req.mockScenario)) {
    next();
    return;
  }

  if (req.mockScenario === 'error') {
    failure(res, {
      status: 500,
      message: 'Mock internal error',
      code: ERROR_CODES.MOCK_INTERNAL_ERROR,
      requestId: req.requestId,
    });
    return;
  }

  if (req.mockScenario === 'unauthorized') {
    failure(res, {
      status: 401,
      message: 'Unauthorized',
      code: ERROR_CODES.UNAUTHORIZED,
      requestId: req.requestId,
    });
    return;
  }

  failure(res, {
    status: 404,
    message: 'Resource not found',
    code: ERROR_CODES.RESOURCE_NOT_FOUND,
    requestId: req.requestId,
  });
}
