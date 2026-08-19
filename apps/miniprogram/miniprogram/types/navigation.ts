/** 一级 Tab 与后续候选路由标识（本阶段多数仅作文档/提示用） */
export type TabRouteKey = 'home' | 'services' | 'kbLife' | 'profile';

export interface TabRouteItem {
  key: TabRouteKey;
  title: string;
  subtitle: string;
  path: string;
}

export type FutureRouteKey =
  | 'NewsList'
  | 'NewsDetail'
  | 'BrandIntro'
  | 'ProductList'
  | 'ProductDetail'
  | 'ProjectCasesList'
  | 'ProjectCaseDetail'
  | 'DigitalCbm'
  | 'FastPhm'
  | 'KbInsights'
  | 'WeTalk'
  | 'EmployeeServices'
  | 'CampusMap'
  | 'ShuttleBus'
  | 'Canteen'
  | 'HolidayCalendar'
  | 'ProfileDetail'
  | 'Notifications'
  | 'Favorites'
  | 'Todos'
  | 'Settings';
