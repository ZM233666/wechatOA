import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

/**
 * Vitest 下 NEWS_ARTICLE 强制关闭，新闻仅回退本地 fixtures。
 * 数据源迁移后 fixtures/news 为空，此处校验空源契约与场景切换。
 */
describe('news API (empty local fixtures)', () => {
  it('returns empty paginated news list', async () => {
    const response = await request(app).get('/api/news').query({ page: 1, pageSize: 3 });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 3,
      total: 0,
    });
  });

  it('returns only the synthetic all category when fixtures are empty', async () => {
    const response = await request(app).get('/api/news/categories');
    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([
      { id: 'all', name: '全部', articleCount: 0 },
    ]);
  });

  it('returns 404 for any news detail id', async () => {
    const response = await request(app).get('/api/news/news-001');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(response.body.message).toBe('Resource not found');
  });

  it('returns empty list for empty scenario', async () => {
    const response = await request(app).get('/api/news').query({ __scenario: 'empty' });
    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.pagination.total).toBe(0);
  });

  it('returns 500 for error scenario', async () => {
    const response = await request(app).get('/api/news').query({ __scenario: 'error' });
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MOCK_INTERNAL_ERROR');
  });

  it('returns empty home latestNews and falls back to fixture banners', async () => {
    const response = await request(app).get('/api/home');
    expect(response.status).toBe(200);
    expect(response.body.data.latestNews).toEqual([]);
    const banners = response.body.data.banners as Array<{ id: string; image: { url: string } }>;
    expect(banners).toHaveLength(3);
    banners.forEach((item) => {
      expect(item.image.url).toMatch(/^https?:\/\//);
    });
  });

  it('returns 400 for invalid pageSize', async () => {
    const response = await request(app).get('/api/news').query({ page: 1, pageSize: 0 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
