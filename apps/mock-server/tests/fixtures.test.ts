import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assertFixtureIntegrity,
  collectAssetPaths,
  FIXTURES_DIR,
  loadFixtures,
  resolveMockAssetAbsolutePath,
} from '../src/services/fixture.service';

describe('fixtures', () => {
  it('loads and validates fixture files', () => {
    const fixtures = loadFixtures();
    expect(() => assertFixtureIntegrity(fixtures)).not.toThrow();
    expect(fixtures.newsArticles.length).toBeGreaterThan(0);
    expect(fixtures.newsList.length).toBeGreaterThan(0);
    expect(fixtures.insightReports).toEqual([]);
    expect(fixtures.wetalkIssues).toEqual([]);
    expect(fixtures.products.length).toBeGreaterThanOrEqual(6);
    expect(fixtures.productDetails.length).toBeGreaterThanOrEqual(3);
    expect(fixtures.cases.length).toBeGreaterThanOrEqual(6);
    expect(fixtures.caseDetails.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps product/case ids aligned and referenced assets present', () => {
    const fixtures = loadFixtures();
    fixtures.products.forEach((item) => {
      expect(fixtures.productDetails.some((detail) => detail.id === item.id)).toBe(true);
    });
    fixtures.cases.forEach((item) => {
      expect(fixtures.caseDetails.some((detail) => detail.id === item.id)).toBe(true);
    });
    const assets = collectAssetPaths(fixtures);
    assets.forEach((assetPath) => {
      const absolute = resolveMockAssetAbsolutePath(assetPath);
      expect(fs.existsSync(absolute), absolute).toBe(true);
    });
    expect(fs.existsSync(FIXTURES_DIR)).toBe(true);
  });
});
