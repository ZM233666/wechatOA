import { describe, expect, it } from 'vitest';
import { campusCodeFromLocation, normalizeKbLifeLocation } from '../src/services/kb-life-campus-code';

describe('kb-life campus API location codes', () => {
  it('maps BJ Office to beijing_office', () => {
    expect(campusCodeFromLocation('BJ Office')).toBe('beijing_office');
  });

  it('maps Suzhou to suzhou', () => {
    expect(campusCodeFromLocation('Suzhou')).toBe('suzhou');
  });

  it('decodes double-encoded campus names', () => {
    expect(normalizeKbLifeLocation('BJ%2520Office')).toBe('BJ Office');
  });
});