import type { TabRouteItem, TabRouteKey } from '../types/navigation';

export interface TabBarItem extends TabRouteItem {
  icon: string;
  selectedIcon: string;
}

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
    title: 'Setting',
    subtitle: 'Setting',
    path: '/pages/profile/index',
  },
];

/** 与 app.json tabBar.list 图标、文案一致（二级页自定义 Tab 用） */
export const TAB_BAR_ITEMS: TabBarItem[] = [
  {
    key: 'home',
    title: 'Home',
    subtitle: 'Home',
    path: '/pages/index/index',
    icon: '/assets/icons/tabbar/tab-home.png',
    selectedIcon: '/assets/icons/tabbar/tab-home-active.png',
  },
  {
    key: 'services',
    title: 'Services',
    subtitle: 'Services',
    path: '/pages/services/index',
    icon: '/assets/icons/tabbar/tab-services.png',
    selectedIcon: '/assets/icons/tabbar/tab-services-active.png',
  },
  {
    key: 'kbLife',
    title: 'KB Life',
    subtitle: 'KB Life',
    path: '/pages/kb-life/index',
    icon: '/assets/icons/tabbar/tab-life.png',
    selectedIcon: '/assets/icons/tabbar/tab-life-active.png',
  },
  {
    key: 'profile',
    title: 'Setting',
    subtitle: 'Setting',
    path: '/pages/profile/index',
    icon: '/assets/icons/tabbar/tab-profile.png',
    selectedIcon: '/assets/icons/tabbar/tab-profile-active.png',
  },
];

/** 按当前页面 route 推断应高亮的 Tab（二级页底部导航） */
export function inferTabRouteKey(route: string): TabRouteKey {
  const normalized = route.replace(/^\//, '');
  if (
    normalized.startsWith('pages/kb-life/') ||
    normalized.startsWith('subpackages/kb-life/')
  ) {
    return 'kbLife';
  }
  if (
    normalized.startsWith('pages/services/') ||
    normalized.startsWith('subpackages/services/')
  ) {
    return 'services';
  }
  if (normalized.startsWith('pages/profile/')) {
    return 'profile';
  }
  return 'home';
}

export const COMING_SOON_TOAST = '功能将在下一阶段开发';
export const NEWS_COMING_SOON_TOAST = '新闻功能将在下一阶段开发';

/** My Dashboard 二级页（Services Hero「My Dashboard」入口） */
export const MY_DASHBOARD_PAGE_PATH = '/subpackages/services/my-dashboard/index';

