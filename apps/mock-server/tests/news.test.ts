import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

/**
 * Vitest 下 NEWS_ARTICLE 强制关闭，新闻回退本地 fixtures。
 */
describe('news API (local fixtures fallback)', () => {
  it('returns paginated news list from fixtures', async () => {
    const response = await request(app).get('/api/news').query({ page: 1, pageSize: 3 });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 3,
    });
    expect(response.body.data.pagination.total).toBeGreaterThan(0);
  });

  it('returns categories with article counts', async () => {
    const response = await request(app).get('/api/news/categories');
    expect(response.status).toBe(200);
    const items = response.body.data.items as Array<{ id: string; articleCount: number }>;
    expect(items[0]).toMatchObject({ id: 'all' });
    expect(items[0].articleCount).toBeGreaterThan(0);
  });

  it('returns news detail for fixture id', async () => {
    const response = await request(app).get('/api/news/news-001');
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('news-001');
    expect(response.body.data.richContent?.length).toBeGreaterThan(0);
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

  it('returns home latestNews from fixtures', async () => {
    const response = await request(app).get('/api/home');
    expect(response.status).toBe(200);
    expect(response.body.data.latestNews.length).toBeGreaterThan(0);
    const banners = response.body.data.banners as Array<{ id: string; image: { url: string } }>;
    expect(banners.length).toBeGreaterThan(0);
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
