import type { NextFunction, Request, Response } from 'express';
import { mockEnv } from '../config/env';

function randomBetween(min: number, max: number): number {
  if (max <= min) {
    return min;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function delayMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!mockEnv.MOCK_DELAY_ENABLED) {
    next();
    return;
  }
  const extra = req.mockScenario === 'slow' ? randomBetween(1500, 3000) : 0;
  const delay = randomBetween(mockEnv.MOCK_DELAY_MIN, mockEnv.MOCK_DELAY_MAX) + extra;
  setTimeout(() => next(), delay);
}
