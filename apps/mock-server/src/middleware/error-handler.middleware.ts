import { ERROR_CODES } from '@app/shared';
import type { NextFunction, Request, Response } from 'express';
import { FixtureValidationError } from '../services/fixture.service';
import { QueryValidationError } from '../utils/query';
import { logError } from '../utils/logger';
import { failure } from '../utils/response';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | null;

  constructor(status: number, message: string, code: string, details: Record<string, unknown> | null = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  void _next;
  if (error instanceof QueryValidationError) {
    failure(res, {
      status: 400,
      message: error.message,
      code: ERROR_CODES.VALIDATION_ERROR,
      requestId: req.requestId,
      details: error.details,
    });
    return;
  }

  if (error instanceof HttpError) {
    failure(res, {
      status: error.status,
      message: error.message,
      code: error.code,
      requestId: req.requestId,
      details: error.details,
    });
    return;
  }

  if (error instanceof FixtureValidationError) {
    logError(error.message);
    failure(res, {
      status: 500,
      message: 'Fixture validation failed',
      code: ERROR_CODES.INTERNAL_ERROR,
      requestId: req.requestId,
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  logError(message);
  failure(res, {
    status: 500,
    message,
    code: ERROR_CODES.INTERNAL_ERROR,
    requestId: req.requestId,
  });
}
