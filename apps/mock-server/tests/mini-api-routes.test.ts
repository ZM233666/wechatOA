import { describe, expect, it } from 'vitest';
import {
  MINI_API_PATH_PREFIX_MOCK,
  MINI_API_RESOURCE_PATHS,
  joinMiniApiPath,
} from '@app/shared';

/** Mock Server 当前挂载在 API_PREFIX=/api 下的静态 GET 路由（与小程序 endpoints 对齐） */
const MOCK_SERVER_STATIC_GET_PATHS = [
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
  '/kb-life/handbook',
  '/kb-life/shuttle',
  '/kb-life/shuttle/trip-plan',
  '/kb-life/activities',
  '/kb-life/wetalk',
  '/kb-life/campus-map',
  '/kb-life/holiday-calendar',
  '/profile',
] as const;

describe('mini-api-routes contract', () => {
  it('shared registry covers mock-server static GET paths', () => {
    for (const path of MOCK_SERVER_STATIC_GET_PATHS) {
      expect(MINI_API_RESOURCE_PATHS).toContain(path);
    }
  });

  it('joinMiniApiPath builds mock and django prefixes', () => {
    expect(joinMiniApiPath(MINI_API_PATH_PREFIX_MOCK, '/home')).toBe('/api/home');
    expect(joinMiniApiPath('/api/v1/mini', '/home')).toBe('/api/v1/mini/home');
  });
});
