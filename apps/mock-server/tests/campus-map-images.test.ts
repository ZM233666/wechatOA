import { describe, expect, it, beforeAll } from 'vitest';
import { getFixtures } from '../src/services/fixture.service';

describe('campus map image resolution', () => {
  beforeAll(() => {
    getFixtures();
  });

  it('builds reader pages from fixture cover image when no PDF', () => {
    const bj = getFixtures().campusMapByLocation['BJ Office'];
    expect(bj).toBeTruthy();
    expect(bj?.pages?.length).toBe(1);
    expect(bj?.pdfUrl).toBeUndefined();
    expect(bj?.pages?.[0]?.coverImage.url).toContain('/mock-assets/kb-life/campus-map-daxing.png');
  });

  it('still resolves PDF-backed locations with pdfUrl', () => {
    const suzhou = getFixtures().campusMapByLocation.Suzhou;
    if (!suzhou?.pdfUrl) {
      return;
    }
    expect(suzhou.pages?.length).toBeGreaterThan(0);
    expect(suzhou.pdfUrl).toContain('/mock-assets/kb-life/campus-maps/files/');
  });
});