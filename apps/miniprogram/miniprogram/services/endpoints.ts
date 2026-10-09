import { buildMiniApiPath } from './api-path';

function p(resourcePath: string): string {
  return buildMiniApiPath(resourcePath);
}

/**
 * 小程序 API 路径（随 env.miniApiPathPrefix 切换 Mock / Django Mini）。
 * 页面与 service 只引用此处，禁止硬编码 /api/...。
 */
export const API_ENDPOINTS = {
  get health() {
    return p('/health');
  },
  get appConfig() {
    return p('/app/config');
  },
  get home() {
    return p('/home');
  },
  get newsCategories() {
    return p('/news/categories');
  },
  get newsList() {
    return p('/news');
  },
  newsDetail: (id: string) => p(`/news/${encodeURIComponent(id)}`),
  get brand() {
    return p('/brand');
  },
  get brandArticles() {
    return p('/brand/articles');
  },
  brandArticleDetail: (id: string) => p(`/brand/articles/${encodeURIComponent(id)}`),
  get productCategories() {
    return p('/products/categories');
  },
  get products() {
    return p('/products');
  },
  productDetail: (id: string) => p(`/products/${encodeURIComponent(id)}`),
  get caseCategories() {
    return p('/cases/categories');
  },
  get cases() {
    return p('/cases');
  },
  caseDetail: (id: string) => p(`/cases/${encodeURIComponent(id)}`),
  get services() {
    return p('/services');
  },
  serviceDetail: (id: string) => p(`/services/${encodeURIComponent(id)}`),
  get serviceInsights() {
    return p('/services/insights');
  },
  serviceInsightDetail: (id: string) => p(`/services/insights/${encodeURIComponent(id)}`),
  get kbLifeEntries() {
    return p('/kb-life/entries');
  },
  get kbLifeCanteen() {
    return p('/kb-life/canteen');
  },
  get kbLifeShuttle() {
    return p('/kb-life/shuttle');
  },
  get kbLifeShuttleTripPlan() {
    return p('/kb-life/shuttle/trip-plan');
  },
  get kbLifeActivities() {
    return p('/kb-life/activities');
  },
  get kbLifeWetalk() {
    return p('/kb-life/wetalk');
  },
  kbLifeWetalkDetail: (id: string) => p(`/kb-life/wetalk/${encodeURIComponent(id)}`),
  get kbLifeCampusMap() {
    return p('/kb-life/campus-map');
  },
  get kbLifeHolidayCalendar() {
    return p('/kb-life/holiday-calendar');
  },
  get kbLifeHandbook() {
    return p('/kb-life/handbook');
  },
  get profile() {
    return p('/profile');
  },
} as const;
