import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { createApp } from '../src/app';
import { resetIdentityBindingsForTest } from '../src/services/identity-binding.service';

const app = createApp();
const CODE = 'mock-wx-login-code';

describe('identity binding API', () => {
  beforeEach(() => {
    resetIdentityBindingsForTest();
  });

  it('returns unbound status initially', async () => {
    const response = await request(app)
      .get('/api/profile/identity-binding')
      .query({ loginCode: CODE });
    expect(response.status).toBe(200);
    expect(response.body.data.bound).toBe(false);
  });

  it('binds exact registry email', async () => {
    const response = await request(app)
      .post('/api/profile/identity-binding')
      .send({ companyEmail: 'edward.chen@knorr-bremse.com', loginCode: CODE });
    expect(response.status).toBe(200);
    expect(response.body.data.binding.companyEmail).toBe('edward.chen@knorr-bremse.com');
    expect(response.body.data.binding.displayName).toContain('Edward');

    const getRes = await request(app)
      .get('/api/profile/identity-binding')
      .query({ loginCode: CODE });
    expect(getRes.body.data.bound).toBe(true);
  });

  it('binds by allowed domain suffix', async () => {
    const response = await request(app)
      .post('/api/profile/identity-binding')
      .send({ companyEmail: 'new.user@knorr-bremse.com', loginCode: CODE });
    expect(response.status).toBe(200);
    expect(response.body.data.binding.roleLabel).toBe('Employee');
  });

  it('rejects unknown email domain', async () => {
    const response = await request(app)
      .post('/api/profile/identity-binding')
      .send({ companyEmail: 'someone@gmail.com', loginCode: CODE });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 403 for WeTalk without employee binding', async () => {
    const response = await request(app)
      .get('/api/kb-life/wetalk')
      .query({ loginCode: CODE });
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('allows campus shuttle after identity bind with loginCode', async () => {
    await request(app)
      .post('/api/profile/identity-binding')
      .send({ companyEmail: 'lina.li@rail.cn', loginCode: CODE });

    const response = await request(app)
      .get('/api/kb-life/shuttle')
      .query({ loginCode: CODE, location: 'Suzhou' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('returns 403 for employee care without binding', async () => {
    const response = await request(app)
      .get('/api/kb-life/care')
      .query({ loginCode: CODE });
    expect(response.status).toBe(403);
  });

  it('returns employee care after bind', async () => {
    await request(app)
      .post('/api/profile/identity-binding')
      .send({ companyEmail: 'lina.li@rail.cn', loginCode: CODE });

    const response = await request(app)
      .get('/api/kb-life/care')
      .query({ loginCode: CODE });
    expect(response.status).toBe(200);
    expect(response.body.data.initiatives.length).toBeGreaterThan(0);
  });

  it('returns employee profile fixture after bind when loginCode is passed to GET /profile', async () => {
    await request(app)
      .post('/api/profile/identity-binding')
      .send({ companyEmail: 'edward.chen@knorr-bremse.com', loginCode: CODE });

    const profileRes = await request(app).get('/api/profile').query({ loginCode: CODE });
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.isLoggedIn).toBe(true);
    expect(profileRes.body.data.user.role).toBe('Employee');
  });
});
