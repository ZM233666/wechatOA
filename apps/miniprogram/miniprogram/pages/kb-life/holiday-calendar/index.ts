import {
  HOLIDAY_YEAR,
  MONTHS_CN,
  MONTHS_EN,
  WEEKDAYS,
  buildCalendarCells,
  buildMonthSchedule,
} from '../../../mock/holiday-calendar';

function getMonthView(monthIndex: number) {
  return {
    monthIndex,
    monthCn: MONTHS_CN[monthIndex],
    monthEn: MONTHS_EN[monthIndex],
    canPrev: monthIndex > 0,
    canNext: monthIndex < 11,
    cells: buildCalendarCells(HOLIDAY_YEAR, monthIndex),
    schedules: buildMonthSchedule(HOLIDAY_YEAR, monthIndex),
  };
}

Page({
  data: {
    year: HOLIDAY_YEAR,
    weekdays: WEEKDAYS,
    ...getMonthView(8),
  },

  onPrevMonth() {
    if (this.data.monthIndex <= 0) {
      return;
    }
    this.setData(getMonthView(this.data.monthIndex - 1));
  },

  onNextMonth() {
    if (this.data.monthIndex >= 11) {
      return;
    }
    this.setData(getMonthView(this.data.monthIndex + 1));
  },
});
