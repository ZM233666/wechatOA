import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { createApp } from '../src/app';
import { resetIdentityBindingsForTest } from '../src/services/identity-binding.service';

const app = createApp();
const CODE = 'mock-wx-login-code';

describe('services API', () => {
  beforeEach(() => {
    resetIdentityBindingsForTest();
  });

  it('returns 403 for My Dashboard modules without identity binding', async () => {
    const response = await request(app)
      .get('/api/services/my-dashboard/modules')
      .query({ loginCode: CODE });
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('returns My Dashboard system modules after bind', async () => {
    await request(app)
      .post('/api/profile/identity-binding')
      .send({ companyEmail: 'lina.li@rail.cn', loginCode: CODE });

    const response = await request(app)
      .get('/api/services/my-dashboard/modules')
      .query({ loginCode: CODE });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const items = response.body.data.items as Array<{ id: string; title: string }>;
    expect(items.length).toBeGreaterThanOrEqual(2);
    const ids = items.map((item) => item.id);
    expect(ids).toContain('fast-phm');
    expect(ids).toContain('ftq-system');
  });
});
