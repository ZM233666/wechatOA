import { describe, expect, it } from 'vitest';
import { getFixtures } from '../src/services/fixture.service';
import {
  buildStatutoryHolidayMarks,
  resolveStatutoryHolidayYear,
} from '../src/services/china-statutory-holiday.service';

const COMPANY_HOLIDAY_NAMES = ['厂休', '厂庆', '园区休'];

const GOC_MAKEUP_WORKDAYS_2025 = [
  '2025-01-26',
  '2025-02-08',
  '2025-04-27',
  '2025-09-28',
  '2025-10-11',
];

const GOC_MAKEUP_WORKDAYS_2026 = [
  '2026-01-04',
  '2026-02-14',
  '2026-02-28',
  '2026-05-09',
  '2026-09-20',
  '2026-10-10',
];

describe('china statutory holiday calendar (chinese-days)', () => {
  it('all campus locations share national statutory marks without company holidays', () => {
    const fixtures = getFixtures();
    const suzhou = fixtures.holidayByLocation.Suzhou;
    const beijing = fixtures.holidayByLocation['BJ Office'];
    expect(suzhou).toBeDefined();
    expect(beijing).toBeDefined();
    expect(suzhou.marks).toEqual(beijing.marks);
    expect(suzhou.marks['2026-12-25']).toBeUndefined();

    const names = Object.values(suzhou.marks).map((mark) => mark.name);
    for (const forbidden of COMPANY_HOLIDAY_NAMES) {
      expect(names).not.toContain(forbidden);
    }
  });

  it('matches State Council makeup workdays for 2025 and 2026', () => {
    const marks2025 = buildStatutoryHolidayMarks(2025);
    const marks2026 = buildStatutoryHolidayMarks(2026);

    for (const date of GOC_MAKEUP_WORKDAYS_2025) {
      expect(marks2025[date]).toEqual({ name: '班', type: 'workday' });
    }
    for (const date of GOC_MAKEUP_WORKDAYS_2026) {
      expect(marks2026[date]).toEqual({ name: '班', type: 'workday' });
    }

    expect(marks2025['2025-01-01']).toEqual({ name: '元旦', type: 'holiday' });
    expect(marks2025['2025-01-02']).toBeUndefined();

    expect(marks2026['2026-02-15']?.type).toBe('holiday');
    expect(marks2026['2026-02-15']?.name).toBe('春节');
    expect(marks2026['2026-02-16']?.type).toBe('holiday');
  });

  it('defaults fixture year to a supported chinese-days year', () => {
    const year = resolveStatutoryHolidayYear();
    expect(year).toBeGreaterThanOrEqual(2025);
    const fixtures = getFixtures();
    expect(fixtures.holidayByLocation.Suzhou.year).toBe(year);
  });
});