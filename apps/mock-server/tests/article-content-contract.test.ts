import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArticleApiError } from '../src/services/article-api-error';

vi.mock('../src/config/env', () => ({ mockEnv: {
  NEWS_ARTICLE_ENABLED: true, NODE_ENV: 'development',
  NEWS_ARTICLE_API_BASE_URL: 'http://cms.test', NEWS_ARTICLE_LIMIT: 50,
  NEWS_ARTICLE_USERNAME: 'test', NEWS_ARTICLE_PASSWORD: 'test',
} }));
vi.mock('../src/utils/logger', () => ({ logInfo: vi.fn() }));

const fetchMock = vi.fn();
beforeEach(() => { vi.resetModules(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());
async function listResponse(data: unknown, code = 2000) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: 2000, data: { access: 'test-only' } })));
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code, data })));
  const client = await import('../src/services/article-content.client');
  return client.fetchArticleContentList({ status: 'published' });
}
describe('CMS list array contract', () => {
  it('accepts a legitimate empty array and sends the published/article filters', async () => {
    await expect(listResponse([])).resolves.toEqual([]);
    expect(fetchMock.mock.calls[1]?.[0]).toContain('content_type=article');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('status=published');
  });
  it.each([null, {}, { results: [] }, { results: [{ id: 1 }] }, 'unexpected'])(
    'rejects non-array data rather than inventing a pagination contract: %j', async (data) => {
      await expect(listResponse(data)).rejects.toMatchObject({ category: 'contract' });
    },
  );
  it('preserves real rows and their cover URL', async () => {
    const rows = [{ id: 42, cover_url: 'https://images.test/real.png' }];
    await expect(listResponse(rows)).resolves.toEqual(rows);
  });
  it('distinguishes a business error from empty data', async () => {
    await expect(listResponse([], 4000)).rejects.toMatchObject({ category: 'business' });
  });
  it('does not put upstream text into safe errors', () => {
    expect(new ArticleApiError('contract').message).toBe('Article API contract error');
  });
});
