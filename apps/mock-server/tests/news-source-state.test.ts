import type { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewsArticleFixture } from '../src/schemas/news.schema';

const mocks = vi.hoisted(() => ({
  enabled: true, fetch: vi.fn(), detail: vi.fn(), map: vi.fn(), mirror: vi.fn(),
  fixtures: vi.fn(), info: vi.fn(), warn: vi.fn(),
}));
vi.mock('../src/config/env', () => ({ mockEnv: { NEWS_ARTICLE_INCLUDE_DRAFTS: false } }));
vi.mock('../src/utils/logger', () => ({ logInfo: mocks.info, logWarn: mocks.warn, logError: vi.fn() }));
vi.mock('../src/services/article-content.client', () => ({
  isArticleNewsEnabled: () => mocks.enabled, ARTICLE_NEWS_SYNC_TTL_MS: 30000,
  fetchNewsArticlesFromBackend: mocks.fetch, fetchArticleContentDetail: mocks.detail,
}));
vi.mock('../src/services/article-news.mapper', () => ({ mapArticleRowToNewsFixture: mocks.map }));
vi.mock('../src/services/article-media-mirror.service', () => ({ hydrateArticleMedia: mocks.mirror }));
vi.mock('../src/services/fixture.service', () => ({
  getFixtures: mocks.fixtures, FixtureValidationError: class extends Error {},
}));
vi.mock('../src/services/asset-url.service', () => ({ withAbsoluteAssets: (_req: unknown, data: unknown) => data }));

const fixture = JSON.parse(readFileSync(path.resolve(__dirname, '../fixtures/news/articles/news-001.json'), 'utf8')) as NewsArticleFixture;
const real: NewsArticleFixture = {
  ...fixture, id: 'article-42', slug: 'real-42',
  coverImage: { ...fixture.coverImage, url: 'https://images.test/real-cover.png' },
};
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); mocks.enabled = true;
  mocks.fetch.mockReset().mockResolvedValue([]);
  mocks.detail.mockReset().mockRejectedValue(new Error('test detail unavailable'));
  mocks.map.mockReset().mockReturnValue(real);
  mocks.mirror.mockReset().mockImplementation(async (_row, mapped) => mapped);
  mocks.fixtures.mockReturnValue({
    newsArticles: [fixture], newsCategories: [fixture.category],
    home: { banners: [{ id: 'fixture-banner' }], quickEntries: [], latestNews: [fixture] },
  });
});
afterEach(() => vi.useRealTimers());
async function homeResponse() {
  const { getHome } = await import('../src/controllers/home.controller');
  const json = vi.fn(); const next = vi.fn();
  const res = { status: vi.fn().mockReturnThis(), json } as unknown as Response;
  await getHome({ mockScenario: 'normal', requestId: 'test' } as Request, res, next);
  return { body: json.mock.calls[0]?.[0], next };
}

describe('CMS source states without implicit fixtures', () => {
  it('returns real empty news and banners, without fixture categories/details', async () => {
    const source = await import('../src/services/news-source.service');
    await expect(source.getNewsArticlesForRequest()).resolves.toEqual([]);
    expect(source.getNewsSourceStatus()).toMatchObject({ source: 'cms', state: 'empty', count: 0 });
    expect(await source.getNewsCategoriesForRequest()).not.toContainEqual(fixture.category);
    expect(await source.getNewsArticleForDetail(fixture.id)).toBeUndefined();
    const { body, next } = await homeResponse();
    expect(next).not.toHaveBeenCalled();
    expect(body.data).toMatchObject({ banners: [], latestNews: [], newsStatus: { source: 'cms', state: 'empty' } });
    expect(mocks.fetch).toHaveBeenCalledTimes(1); // legitimate empty lists honor TTL
  });
  it('serves fixtures only when explicitly disabled for demo/offline mode', async () => {
    mocks.enabled = false;
    const source = await import('../src/services/news-source.service');
    expect(await source.getNewsArticlesForRequest()).toEqual([fixture]);
    expect(source.getNewsSourceStatus()).toMatchObject({ source: 'fixtures', state: 'success' });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect((await homeResponse()).body.data.latestNews[0].id).toBe(fixture.id);
  });
  it('reports HTTP 503 semantics without a previous CMS snapshot', async () => {
    mocks.fetch.mockRejectedValue(new Error('private upstream body must not escape'));
    const source = await import('../src/services/news-source.service');
    await expect(source.getNewsArticlesForRequest()).rejects.toMatchObject({
      status: 503, code: 'NEWS_SOURCE_UNAVAILABLE', details: { source: 'cms', state: 'error', errorCategory: 'network' },
    });
    const { next } = await homeResponse();
    expect(next.mock.calls[0]?.[0]).toMatchObject({ status: 503 });
    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain('private upstream body');
  });
  it('returns successful CMS articles and real covers without fixtures', async () => {
    mocks.fetch.mockResolvedValueOnce([{ id: 42, cover_url: real.coverImage.url }]);
    const { body, next } = await homeResponse();
    expect(next).not.toHaveBeenCalled();
    expect(body.data.newsStatus).toMatchObject({ source: 'cms', state: 'success', count: 1 });
    expect(body.data.latestNews[0].id).toBe('article-42');
    expect(body.data.latestNews[0].coverImage.url).toBe(real.coverImage.url);
    expect(body.data.banners[0].image.url).toBe(real.coverImage.url);
  });
  it('recovers from a sync failure without switching to fixtures', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('test initial failure'));
    const source = await import('../src/services/news-source.service');
    await expect(source.getNewsArticlesForRequest()).rejects.toMatchObject({ status: 503 });
    mocks.fetch.mockResolvedValueOnce([{ id: 42, cover_url: real.coverImage.url }]);
    await expect(source.getNewsArticlesForRequest()).resolves.toEqual([real]);
    expect(source.getNewsSourceStatus()).toMatchObject({ source: 'cms', state: 'success', count: 1 });
  });
  it('keeps previous real articles and marks stale on isolated sync failure', async () => {
    mocks.fetch.mockResolvedValueOnce([{ id: 42, cover_url: real.coverImage.url }]);
    const sync = await import('../src/services/article-news.service');
    const source = await import('../src/services/news-source.service');
    await sync.syncArticleNews();
    mocks.fetch.mockRejectedValue(new Error('test failure'));
    await sync.syncArticleNews({ force: true });
    expect(sync.getArticleNewsArticles()).toEqual([real]);
    expect(source.getNewsSourceStatus()).toMatchObject({ source: 'cms', state: 'stale', count: 1 });
    const { body } = await homeResponse();
    expect(body.data.latestNews[0].id).toBe('article-42');
    expect(body.data.latestNews[0].coverImage.url).toBe(real.coverImage.url);
    expect(body.data.banners[0].image.url).toBe(real.coverImage.url);
  });
  it('keeps a successful empty snapshot distinguishable from an initial error', async () => {
    const sync = await import('../src/services/article-news.service');
    const source = await import('../src/services/news-source.service');
    await sync.syncArticleNews();
    mocks.fetch.mockRejectedValue(new Error('test failure'));
    await sync.syncArticleNews({ force: true });
    await expect(source.getNewsArticlesForRequest()).resolves.toEqual([]);
    expect(source.getNewsSourceStatus()).toMatchObject({ state: 'stale', count: 0 });
  });
  it('replaces deleted CMS content with successful empty results', async () => {
    mocks.fetch.mockResolvedValueOnce([{ id: 42, cover_url: real.coverImage.url }]);
    const sync = await import('../src/services/article-news.service');
    await sync.syncArticleNews();
    await sync.syncArticleNews({ force: true });
    expect(sync.getArticleNewsArticles()).toEqual([]);
    expect(sync.getArticleNewsStatus().lastError).toBeUndefined();
  });
  it('deduplicates concurrent syncs, including forced ones', async () => {
    let resolve!: (rows: never[]) => void;
    mocks.fetch.mockReturnValueOnce(new Promise<never[]>((done) => { resolve = done; }));
    const sync = await import('../src/services/article-news.service');
    const first = sync.syncArticleNews({ force: true });
    const second = sync.syncArticleNews({ force: true });
    resolve([]);
    await Promise.all([first, second]);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});
