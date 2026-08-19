import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

describe('news API', () => {
  it('returns paginated news list', async () => {
    const response = await request(app).get('/api/news').query({ page: 1, pageSize: 3 });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(3);
    expect(response.body.data.pagination.page).toBe(1);
    expect(response.body.data.pagination.pageSize).toBe(3);
    expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(8);
    expect(response.body.data.items[0].coverImage.url).toContain('/mock-assets/news/');
    expect(response.body.data.items[0].coverImage.url).toMatch(/^https?:\/\//);
  });

  it('does not return richContent in list items', async () => {
    const response = await request(app).get('/api/news').query({ page: 1, pageSize: 8 });
    expect(response.status).toBe(200);
    response.body.data.items.forEach((item: Record<string, unknown>) => {
      expect(item).not.toHaveProperty('richContent');
      expect(item).not.toHaveProperty('status');
      expect(item).not.toHaveProperty('placement');
    });
  });

  it('filters by category', async () => {
    const response = await request(app).get('/api/news').query({ category: 'company', page: 1, pageSize: 20 });
    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    response.body.data.items.forEach((item: { category: { id: string } }) => {
      expect(item.category.id).toBe('company');
    });
  });

  it('searches title, summary and tags but not richContent', async () => {
    const response = await request(app).get('/api/news').query({ keyword: '轨道交通', page: 1, pageSize: 20 });
    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    const hidden = await request(app).get('/api/news').query({ keyword: '草稿内容不得出现', page: 1, pageSize: 20 });
    expect(hidden.body.data.items).toEqual([]);
  });

  it('filters featured news', async () => {
    const response = await request(app).get('/api/news').query({ featured: true, page: 1, pageSize: 20 });
    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    response.body.data.items.forEach((item: { featured: boolean }) => {
      expect(item.featured).toBe(true);
    });
  });

  it('keeps pinned items first and uses stable id fallback', async () => {
    const response = await request(app).get('/api/news').query({ page: 1, pageSize: 20 });
    const items = response.body.data.items as Array<{ id: string; pinned: boolean }>;
    const firstUnpinned = items.findIndex((item) => !item.pinned);
    if (firstUnpinned >= 0) {
      items.slice(0, firstUnpinned).forEach((item) => expect(item.pinned).toBe(true));
    }
    expect(items[0].id).toBe('news-001');
  });

  it('counts only public articles in categories', async () => {
    const response = await request(app).get('/api/news/categories');
    expect(response.status).toBe(200);
    const items = response.body.data.items as Array<{ id: string; articleCount: number }>;
    const all = items.find((item) => item.id === 'all');
    expect(all?.articleCount).toBeGreaterThanOrEqual(8);
    const list = await request(app).get('/api/news').query({ page: 1, pageSize: 50 });
    expect(all?.articleCount).toBe(list.body.data.pagination.total);
    expect(items.every((item) => item.articleCount >= 0)).toBe(true);
  });

  it('returns news detail with richContent and related summaries', async () => {
    const response = await request(app).get('/api/news/news-001');
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('news-001');
    expect(Array.isArray(response.body.data.richContent)).toBe(true);
    expect(response.body.data.richContent.length).toBeGreaterThan(0);
    expect(response.body.data.coverImage.url).toMatch(/^https?:\/\//);
    expect(response.body.data.relatedArticles).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: expect.any(String) })]),
    );
    response.body.data.relatedArticles.forEach((item: { id: string; richContent?: unknown }) => {
      expect(item.id).not.toBe('news-001');
      expect(item).not.toHaveProperty('richContent');
    });
    expect(response.body.data).not.toHaveProperty('status');
  });

  it('resolves public detail by slug', async () => {
    const response = await request(app).get('/api/news/cr450-braking-systems-contract');
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('news-001');
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

  it('returns 404 for missing news id', async () => {
    const response = await request(app).get('/api/news/news-missing');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(response.body.message).toBe('Resource not found');
  });

  it('returns 404 for draft, scheduled and archived articles with the same message', async () => {
    for (const id of ['news-draft-demo', 'news-scheduled-demo', 'news-archived-demo']) {
      const response = await request(app).get(`/api/news/${id}`);
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(response.body.message).toBe('Resource not found');
    }
  });

  it('does not leak unpublished ids in public list', async () => {
    const response = await request(app).get('/api/news').query({ page: 1, pageSize: 50 });
    const ids = response.body.data.items.map((item: { id: string }) => item.id);
    expect(ids).not.toContain('news-draft-demo');
    expect(ids).not.toContain('news-scheduled-demo');
    expect(ids).not.toContain('news-archived-demo');
  });

  it('opens detail for every public list id', async () => {
    const list = await request(app).get('/api/news').query({ page: 1, pageSize: 50 });
    for (const item of list.body.data.items as Array<{ id: string }>) {
      const detail = await request(app).get(`/api/news/${item.id}`);
      expect(detail.status).toBe(200);
      expect(detail.body.data.id).toBe(item.id);
      expect(Array.isArray(detail.body.data.richContent)).toBe(true);
    }
  });

  it('returns at most 3 public home news marked showOnHome', async () => {
    const response = await request(app).get('/api/home');
    expect(response.status).toBe(200);
    const latestNews = response.body.data.latestNews as Array<{ id: string; richContent?: unknown }>;
    expect(latestNews.length).toBeGreaterThan(0);
    expect(latestNews.length).toBeLessThanOrEqual(3);
    latestNews.forEach((item) => {
      expect(item).not.toHaveProperty('richContent');
      expect(['news-draft-demo', 'news-scheduled-demo', 'news-archived-demo']).not.toContain(item.id);
    });
    expect(latestNews[0].id).toBe('news-001');
  });

  it('builds home banners from news marked showOnBanner', async () => {
    const response = await request(app).get('/api/home');
    const banners = response.body.data.banners as Array<{
      id: string;
      newsId?: string;
      targetUrl?: string;
      image: { url: string };
    }>;
    expect(banners).toHaveLength(3);
    expect(banners.map((item) => item.newsId)).toEqual(['news-001', 'news-002', 'news-003']);
    banners.forEach((item) => {
      expect(item.targetUrl).toBe(`/pages/news/detail?id=${item.newsId}`);
      expect(item.image.url).toMatch(/^https?:\/\//);
      expect(item.image.url).toContain('/mock-assets/news/');
    });
  });

  it('returns 400 for invalid pageSize', async () => {
    const response = await request(app).get('/api/news').query({ page: 1, pageSize: 0 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
