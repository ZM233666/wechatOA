import type { MockScenario } from '../config/env';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      mockScenario: MockScenario;
    }
  }
}

export {};
