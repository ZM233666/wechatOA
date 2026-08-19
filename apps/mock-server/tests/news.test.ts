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

  it('returns news detail with richContent', async () => {
    const response = await request(app).get('/api/news/news-001');
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('news-001');
    expect(Array.isArray(response.body.data.richContent)).toBe(true);
    expect(response.body.data.richContent.length).toBeGreaterThan(0);
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
  });

  it('returns 400 for invalid pageSize', async () => {
    const response = await request(app).get('/api/news').query({ page: 1, pageSize: 0 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
