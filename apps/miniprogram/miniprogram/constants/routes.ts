import type { TabRouteItem } from '../types/navigation';

/** 四个一级 Tab 路径（与 app.json 保持一致） */
export const TAB_ROUTES: TabRouteItem[] = [
  {
    key: 'home',
    title: 'Home',
    subtitle: 'Home',
    path: '/pages/index/index',
  },
  {
    key: 'services',
    title: 'Services',
    subtitle: 'Services',
    path: '/pages/services/index',
  },
  {
    key: 'kbLife',
    title: 'KB Life',
    subtitle: 'KB Life',
    path: '/pages/kb-life/index',
  },
  {
    key: 'profile',
    title: 'My Profile',
    subtitle: 'My Profile',
    path: '/pages/profile/index',
  },
];

export const COMING_SOON_TOAST = '功能将在下一阶段开发';
export const NEWS_COMING_SOON_TOAST = '新闻功能将在下一阶段开发';
