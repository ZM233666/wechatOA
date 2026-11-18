export type HolidayMarkType = 'holiday' | 'workday';

export interface HolidayMark {
  name: string;
  type: HolidayMarkType;
}

export interface CalendarCell {
  key: string;
  empty: boolean;
  day?: number;
  dateKey?: string;
  kind?: 'normal' | 'weekend' | 'holiday' | 'workday';
  holidayName?: string;
  isToday?: boolean;
}

export interface MonthScheduleItem {
  name: string;
  days: number;
  rangeCn: string;
  rangeEn: string;
}

export const HOLIDAY_YEAR = 2026;

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const MONTHS_CN = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
];

export const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** 日历渲染默认空标记；法定节假日与调休以接口返回为准 */
export const EMPTY_HOLIDAY_MARKS: Record<string, HolidayMark> = {};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export function getDefaultMonthIndex(now: Date = new Date()): number {
  if (now.getFullYear() < HOLIDAY_YEAR) {
    return 0;
  }
  if (now.getFullYear() > HOLIDAY_YEAR) {
    return 11;
  }
  return now.getMonth();
}

export function getTodayDateKey(now: Date = new Date()): string {
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function buildCalendarCells(
  year: number,
  monthIndex: number,
  todayKey: string = getTodayDateKey(),
  marks: Record<string, HolidayMark> = EMPTY_HOLIDAY_MARKS,
): CalendarCell[] {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push({
      key: `empty-${monthIndex}-${i}`,
      empty: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(year, monthIndex, day);
    const mark = marks[dateKey];
    const weekday = new Date(year, monthIndex, day).getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    let kind: CalendarCell['kind'] = 'normal';
    if (mark?.type === 'holiday') {
      kind = 'holiday';
    } else if (mark?.type === 'workday') {
      kind = 'workday';
    } else if (isWeekend) {
      kind = 'weekend';
    }

    cells.push({
      key: dateKey,
      empty: false,
      day,
      dateKey,
      kind,
      holidayName: mark?.type === 'holiday' ? mark.name : undefined,
      isToday: dateKey === todayKey,
    });
  }

  return cells;
}

export function buildMonthSchedule(
  year: number,
  monthIndex: number,
  marks: Record<string, HolidayMark> = EMPTY_HOLIDAY_MARKS,
): MonthScheduleItem[] {
  const prefix = `${year}-${pad(monthIndex + 1)}-`;
  const grouped: Array<{ name: string; days: number[] }> = [];

  Object.entries(marks)
    .filter(([dateKey, mark]) => mark.type === 'holiday' && dateKey.startsWith(prefix))
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([dateKey, mark]) => {
      const day = Number(dateKey.slice(-2));
      const last = grouped[grouped.length - 1];
      if (last && last.name === mark.name) {
        last.days.push(day);
        return;
      }
      grouped.push({ name: mark.name, days: [day] });
    });

  return grouped.map((item) => {
    const start = item.days[0];
    const end = item.days[item.days.length - 1];
    const sameDay = start === end;

    return {
      name: item.name,
      days: item.days.length,
      rangeCn: sameDay
        ? `${MONTHS_CN[monthIndex]}${start}日`
        : `${MONTHS_CN[monthIndex]}${start}日 - ${end}日`,
      rangeEn: sameDay
        ? `${MONTHS_EN[monthIndex]} ${start}`
        : `${MONTHS_EN[monthIndex]} ${start}-${end}`,
    };
  });
}
