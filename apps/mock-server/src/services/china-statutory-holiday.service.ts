import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { HolidayCalendarData } from '@app/shared';

const require = createRequire(__filename);

type ChineseDaysYearFile = {
  holidays: Record<string, string>;
  workdays: Record<string, string>;
};

const yearFileCache = new Map<number, ChineseDaysYearFile>();

function chineseDaysYearsDir(): string {
  const packageJson = require.resolve('chinese-days/package.json');
  return path.join(path.dirname(packageJson), 'dist', 'years');
}

/** `chinese-days` 包内已收录的年份（随依赖升级扩展，无需手改 fixture） */
export function listChineseDaysHolidayYears(): number[] {
  const dir = chineseDaysYearsDir();
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => Number(name.replace(/\.json$/u, '')))
    .filter((year) => Number.isInteger(year) && year > 0)
    .sort((a, b) => a - b);
}

function loadChineseDaysYearFile(year: number): ChineseDaysYearFile {
  const cached = yearFileCache.get(year);
  if (cached) {
    return cached;
  }
  const filePath = path.join(chineseDaysYearsDir(), `${year}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `chinese-days 未提供 ${year} 年节假日数据，请升级 mock-server 依赖 chinese-days 至含该年份的版本`,
    );
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ChineseDaysYearFile;
  yearFileCache.set(year, data);
  return data;
}

function shortHolidayNameFromRaw(raw: string): string {
  const cn = raw.split(',')[1]?.trim() ?? '';
  if (!cn) {
    return '法定假日';
  }
  if (cn.includes('元旦')) {
    return '元旦';
  }
  if (cn.includes('春节')) {
    return '春节';
  }
  if (cn.includes('清明')) {
    return '清明';
  }
  if (cn.includes('劳动')) {
    return '劳动';
  }
  if (cn.includes('端午')) {
    return '端午';
  }
  if (cn.includes('中秋')) {
    return '中秋';
  }
  if (cn.includes('国庆')) {
    return '国庆';
  }
  return cn;
}

export function resolveStatutoryHolidayYear(requested?: number): number {
  const supported = listChineseDaysHolidayYears();
  if (!supported.length) {
    throw new Error('chinese-days 未包含任何年度节假日数据');
  }
  const year = requested ?? new Date().getFullYear();
  if (supported.includes(year)) {
    return year;
  }
  return supported[supported.length - 1];
}

/** 将 chinese-days 年度 JSON 转为小程序假期日历契约 */
export function buildStatutoryHolidayMarks(year: number): HolidayCalendarData['marks'] {
  const source = loadChineseDaysYearFile(year);
  const marks: HolidayCalendarData['marks'] = {};

  for (const [dateKey, raw] of Object.entries(source.holidays)) {
    marks[dateKey] = {
      name: shortHolidayNameFromRaw(raw),
      type: 'holiday',
    };
  }
  for (const dateKey of Object.keys(source.workdays)) {
    marks[dateKey] = {
      name: '班',
      type: 'workday',
    };
  }
  return marks;
}

export function buildStatutoryHolidayCalendarForLocation(
  location: string,
  year?: number,
): HolidayCalendarData {
  const resolvedYear = resolveStatutoryHolidayYear(year);
  return {
    year: resolvedYear,
    location,
    marks: buildStatutoryHolidayMarks(resolvedYear),
  };
}