import {
  HOLIDAY_YEAR,
  MONTHS_CN,
  MONTHS_EN,
  WEEKDAYS,
  buildCalendarCells,
  buildMonthSchedule,
  getDefaultMonthIndex,
  getTodayDateKey,
  type HolidayMark,
} from '../../../mock/holiday-calendar';
import { getHolidayCalendar } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';
import { resolveCampusLocation } from '../../../utils/campus-location';

function getMonthView(
  year: number,
  monthIndex: number,
  marks: Record<string, HolidayMark>,
  todayKey = getTodayDateKey(),
) {
  return {
    monthIndex,
    monthCn: MONTHS_CN[monthIndex],
    monthEn: MONTHS_EN[monthIndex],
    canPrev: monthIndex > 0,
    canNext: monthIndex < 11,
    cells: buildCalendarCells(year, monthIndex, todayKey, marks),
    schedules: buildMonthSchedule(year, monthIndex, marks),
  };
}

Page({
  data: {
    location: '',
    navTitle: 'Holiday Calendar',
    year: HOLIDAY_YEAR,
    weekdays: WEEKDAYS,
    todayKey: '',
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
    marks: {} as Record<string, HolidayMark>,
    ...getMonthView(HOLIDAY_YEAR, getDefaultMonthIndex(), {}),
  },

  onLoad(query: Record<string, string | undefined>) {
    this.location = resolveCampusLocation(query.location);
    void this.loadHoliday();
  },

  location: '' as string,

  async loadHoliday() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getHolidayCalendar(this.location);
      const todayKey = getTodayDateKey();
      const year = result.year || HOLIDAY_YEAR;
      this.setData({
        location: result.location,
        navTitle: `Holiday Calendar · ${result.location}`,
        year,
        todayKey,
        marks: result.marks,
        pageStatus: 'success',
        ...getMonthView(year, getDefaultMonthIndex(), result.marks, todayKey),
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '假期日历加载失败',
      });
    }
  },

  onPrevMonth() {
    if (this.data.monthIndex <= 0) {
      return;
    }
    this.setData(
      getMonthView(this.data.year, this.data.monthIndex - 1, this.data.marks, this.data.todayKey),
    );
  },

  onNextMonth() {
    if (this.data.monthIndex >= 11) {
      return;
    }
    this.setData(
      getMonthView(this.data.year, this.data.monthIndex + 1, this.data.marks, this.data.todayKey),
    );
  },
});
