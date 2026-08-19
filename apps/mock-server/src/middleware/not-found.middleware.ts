import { ERROR_CODES } from '@app/shared';
import type { Request, Response } from 'express';
import { failure } from '../utils/response';

export function notFoundMiddleware(req: Request, res: Response): void {
  failure(res, {
    status: 404,
    message: `Route not found: ${req.method} ${req.path}`,
    code: ERROR_CODES.RESOURCE_NOT_FOUND,
    requestId: req.requestId ?? 'mock_unknown',
  });
}
