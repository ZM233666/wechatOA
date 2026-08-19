import type { Request } from 'express';
import { isMockScenario, mockEnv, type MockScenario } from '../config/env';

export function resolveScenario(req: Request): MockScenario {
  // Mock-only: X-Mock-Scenario / __scenario 不得进入正式 NestJS API。
  const header = req.header('X-Mock-Scenario');
  if (header && isMockScenario(header)) {
    return header;
  }
  const queryValue = req.query.__scenario;
  if (typeof queryValue === 'string' && isMockScenario(queryValue)) {
    return queryValue;
  }
  return mockEnv.MOCK_DEFAULT_SCENARIO;
}

export function shouldShortCircuitScenario(scenario: MockScenario): boolean {
  return scenario === 'error' || scenario === 'unauthorized' || scenario === 'not-found';
}
