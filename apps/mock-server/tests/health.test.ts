import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { assertFixtureIntegrity, loadFixtures } from '../src/services/fixture.service';

const app = createApp();

describe('GET /api/health', () => {
  it('returns mock server health payload', async () => {
    assertFixtureIntegrity(loadFixtures());
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.service).toBe('mock-server');
    expect(response.body.data.mode).toBe('mock');
    expect(response.body.requestId).toMatch(/^mock_/);
  });
});
