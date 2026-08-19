import type { ApiErrorBody, ApiResponse } from '@app/shared';
import type { Response } from 'express';

export function nowIso(): string {
  return new Date().toISOString();
}

export function success<T>(
  res: Response,
  data: T,
  requestId: string,
  status = 200,
  message = 'success',
): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    message,
    requestId,
    timestamp: nowIso(),
  };
  return res.status(status).json(body);
}

export function failure(
  res: Response,
  options: {
    status: number;
    message: string;
    code: string;
    requestId: string;
    details?: Record<string, unknown> | null;
  },
): Response {
  const error: ApiErrorBody = {
    code: options.code,
    details: options.details ?? null,
  };
  const body: ApiResponse<null> = {
    success: false,
    data: null,
    message: options.message,
    error,
    requestId: options.requestId,
    timestamp: nowIso(),
  };
  return res.status(options.status).json(body);
}
