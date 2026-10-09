/**
 * 小程序 Mini API 资源路径（不含前缀）。
 * - Mock：`{apiBaseUrl}` + `/api` + path  → 例 http://127.0.0.1:3100/api/home
 * - Django：`{apiBaseUrl}` + `/api/v1/mini` + path
 */
export const MINI_API_RESOURCE_PATHS = [
  '/health',
  '/app/config',
  '/home',
  '/news/categories',
  '/news',
  '/brand',
  '/brand/articles',
  '/products/categories',
  '/products',
  '/cases/categories',
  '/cases',
  '/services',
  '/services/insights',
  '/kb-life/entries',
  '/kb-life/canteen',
  '/kb-life/shuttle',
  '/kb-life/shuttle/trip-plan',
  '/kb-life/activities',
  '/kb-life/wetalk',
  '/kb-life/campus-map',
  '/kb-life/holiday-calendar',
  '/kb-life/handbook',
  '/profile',
] as const;

export type MiniApiResourcePath = (typeof MINI_API_RESOURCE_PATHS)[number];

/** 动态段路由模板（契约登记，供测试与文档对照） */
export const MINI_API_DYNAMIC_ROUTE_TEMPLATES = [
  '/news/:id',
  '/brand/articles/:id',
  '/products/:id',
  '/cases/:id',
  '/services/:id',
  '/services/insights/:id',
  '/kb-life/wetalk/:id',
] as const;

export const MINI_API_PATH_PREFIX_MOCK = '/api';
export const MINI_API_PATH_PREFIX_DJANGO = '/api/v1/mini';

export function joinMiniApiPath(prefix: string, resourcePath: string): string {
  const normalizedPrefix = prefix.replace(/\/+$/, '');
  const normalizedResource = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
  return `${normalizedPrefix}${normalizedResource}`;
}
