import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const incoming = req.header('X-Request-Id');
  req.requestId = incoming && incoming.trim() ? incoming.trim() : `mock_${randomUUID()}`;
  next();
}
