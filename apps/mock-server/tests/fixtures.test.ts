import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertFixtureIntegrity, collectAssetPaths, FIXTURES_DIR, loadFixtures, PUBLIC_DIR } from '../src/services/fixture.service';

describe('fixtures', () => {
  it('loads and validates all fixture files', () => {
    const fixtures = loadFixtures();
    expect(() => assertFixtureIntegrity(fixtures)).not.toThrow();
    expect(fixtures.newsList.length).toBeGreaterThanOrEqual(8);
    expect(fixtures.newsArticles.length).toBeGreaterThanOrEqual(3);
    expect(fixtures.products.length).toBeGreaterThanOrEqual(6);
    expect(fixtures.productDetails.length).toBeGreaterThanOrEqual(3);
    expect(fixtures.cases.length).toBeGreaterThanOrEqual(6);
    expect(fixtures.caseDetails.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps list and detail ids aligned and assets present', () => {
    const fixtures = loadFixtures();
    const newsIds = new Set(fixtures.newsList.map((item) => item.id));
    fixtures.newsList.forEach((item) => {
      expect(newsIds.has(item.id)).toBe(true);
      expect(fixtures.newsArticles.some((article) => article.id === item.id && article.status === 'published')).toBe(
        true,
      );
    });
    const unpublished = fixtures.newsArticles.filter((item) => item.status !== 'published');
    unpublished.forEach((article) => {
      expect(newsIds.has(article.id)).toBe(false);
    });
    const assets = collectAssetPaths(fixtures);
    assets.forEach((assetPath) => {
      const absolute = path.join(PUBLIC_DIR, assetPath.replace(/^\//, ''));
      expect(fs.existsSync(absolute), absolute).toBe(true);
    });
    expect(fs.existsSync(FIXTURES_DIR)).toBe(true);
  });
});
