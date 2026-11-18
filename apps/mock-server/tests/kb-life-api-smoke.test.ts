import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { createApp } from '../src/app';
import { resetIdentityBindingsForTest } from '../src/services/identity-binding.service';

const app = createApp();
const CODE = 'mock-kb-life-smoke';

async function bindEmployee() {
  await request(app)
    .post('/api/profile/identity-binding')
    .send({ companyEmail: 'lina.li@rail.cn', loginCode: CODE });
}

describe('KB Life API smoke', () => {
  beforeEach(() => {
    resetIdentityBindingsForTest();
  });

  it('GET /kb-life/entries returns 200', async () => {
    const res = await request(app).get('/api/kb-life/entries').query({ location: 'Suzhou' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.banners)).toBe(true);
  });

  it('GET /kb-life/care returns 200 after bind with initiatives', async () => {
    await bindEmployee();
    const res = await request(app).get('/api/kb-life/care').query({ loginCode: CODE });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.initiatives.length).toBeGreaterThan(0);
  });

  it('GET /kb-life/shuttle returns 200 after bind', async () => {
    await bindEmployee();
    const res = await request(app)
      .get('/api/kb-life/shuttle')
      .query({ loginCode: CODE, location: 'Suzhou' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /kb-life/canteen returns 200 after bind', async () => {
    await bindEmployee();
    const res = await request(app)
      .get('/api/kb-life/canteen')
      .query({ loginCode: CODE, location: 'Suzhou' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /kb-life/campus-map returns 200 after bind', async () => {
    await bindEmployee();
    const res = await request(app)
      .get('/api/kb-life/campus-map')
      .query({ loginCode: CODE, location: 'Suzhou' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /kb-life/holiday-calendar returns 200 after bind', async () => {
    await bindEmployee();
    const res = await request(app)
      .get('/api/kb-life/holiday-calendar')
      .query({ loginCode: CODE, location: 'Suzhou' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});