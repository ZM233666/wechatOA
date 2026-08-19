import type { MockScenario } from '../config/env';

export interface LoadedFixtures {
  files: string[];
}

export interface ScenarioContext {
  scenario: MockScenario;
}
