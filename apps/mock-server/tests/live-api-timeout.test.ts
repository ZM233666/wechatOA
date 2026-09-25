import { describe, expect, it } from 'vitest';
import { raceWithBudget } from '../src/services/live-api-timeout';

describe('raceWithBudget', () => {
  it('returns the pending value when it finishes in time', async () => {
    const result = await raceWithBudget(Promise.resolve('live'), 'fallback', 50);
    expect(result).toBe('live');
  });

  it('returns fallback when the pending work exceeds the budget', async () => {
    const pending = new Promise<string>((resolve) => {
      setTimeout(() => resolve('live'), 80);
    });
    const result = await raceWithBudget(pending, 'fallback', 20);
    expect(result).toBe('fallback');
    expect(await pending).toBe('live');
  });
});
