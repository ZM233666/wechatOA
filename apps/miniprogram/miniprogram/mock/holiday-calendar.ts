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

/** 2026 法定节假日与调休，来源对齐 Demo */
export const HOLIDAY_MARKS: Record<string, HolidayMark> = {
  '2026-01-01': { name: '元旦', type: 'holiday' },
  '2026-01-02': { name: '元旦', type: 'holiday' },
  '2026-01-03': { name: '元旦', type: 'holiday' },
  '2026-02-14': { name: '班', type: 'workday' },
  '2026-02-15': { name: '班', type: 'workday' },
  '2026-02-16': { name: '除夕', type: 'holiday' },
  '2026-02-17': { name: '春节', type: 'holiday' },
  '2026-02-18': { name: '春节', type: 'holiday' },
  '2026-02-19': { name: '春节', type: 'holiday' },
  '2026-02-20': { name: '春节', type: 'holiday' },
  '2026-02-21': { name: '春节', type: 'holiday' },
  '2026-02-22': { name: '春节', type: 'holiday' },
  '2026-02-23': { name: '春节', type: 'holiday' },
  '2026-04-04': { name: '清明', type: 'holiday' },
  '2026-04-05': { name: '清明', type: 'holiday' },
  '2026-04-06': { name: '清明', type: 'holiday' },
  '2026-04-26': { name: '班', type: 'workday' },
  '2026-05-01': { name: '劳动', type: 'holiday' },
  '2026-05-02': { name: '劳动', type: 'holiday' },
  '2026-05-03': { name: '劳动', type: 'holiday' },
  '2026-05-04': { name: '劳动', type: 'holiday' },
  '2026-05-05': { name: '劳动', type: 'holiday' },
  '2026-05-09': { name: '班', type: 'workday' },
  '2026-06-19': { name: '端午', type: 'holiday' },
  '2026-06-20': { name: '端午', type: 'holiday' },
  '2026-06-21': { name: '端午', type: 'holiday' },
  '2026-09-20': { name: '班', type: 'workday' },
  '2026-09-25': { name: '中秋', type: 'holiday' },
  '2026-09-26': { name: '中秋', type: 'holiday' },
  '2026-09-27': { name: '中秋', type: 'holiday' },
  '2026-10-01': { name: '国庆', type: 'holiday' },
  '2026-10-02': { name: '国庆', type: 'holiday' },
  '2026-10-03': { name: '国庆', type: 'holiday' },
  '2026-10-04': { name: '国庆', type: 'holiday' },
  '2026-10-05': { name: '国庆', type: 'holiday' },
  '2026-10-06': { name: '国庆', type: 'holiday' },
  '2026-10-07': { name: '国庆', type: 'holiday' },
  '2026-10-10': { name: '班', type: 'workday' },
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export function buildCalendarCells(year: number, monthIndex: number): CalendarCell[] {
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
    const mark = HOLIDAY_MARKS[dateKey];
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
    });
  }

  return cells;
}

export function buildMonthSchedule(year: number, monthIndex: number): MonthScheduleItem[] {
  const prefix = `${year}-${pad(monthIndex + 1)}-`;
  const grouped: Array<{ name: string; days: number[] }> = [];

  Object.entries(HOLIDAY_MARKS)
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
