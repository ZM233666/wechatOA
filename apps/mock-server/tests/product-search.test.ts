import { describe, expect, it } from 'vitest';
import {
  buildProductSummarySearchHaystack,
  productSummaryMatchesKeyword,
} from '../src/services/product-search.service';
import { matchesKeyword } from '../src/utils/query';

describe('product search', () => {
  it('matchesKeyword supports multi-token substring search', () => {
    expect(matchesKeyword('EP Compact brake control', 'compact brake')).toBe(true);
    expect(matchesKeyword('EP Compact brake control', 'compact door')).toBe(false);
  });

  it('productSummaryMatchesKeyword uses id, names, summary and extras', () => {
    const item = {
      id: 'product-005',
      name: 'Bogie Equipment',
      nameCn: '转向架基础制动',
      summary: 'Brake calipers, discs, and pads.',
      category: { id: 'braking', name: 'Braking Systems' },
      coverImage: { url: '', alt: 'x', width: 1, height: 1, aspectRatio: 1 },
      featured: false,
    };
    expect(productSummaryMatchesKeyword(item, 'product-005')).toBe(true);
    expect(productSummaryMatchesKeyword(item, 'calipers')).toBe(true);
    expect(productSummaryMatchesKeyword(item, '转向架')).toBe(true);
    expect(
      productSummaryMatchesKeyword(item, 'rated voltage', 'Parameter rated voltage 110V DC'),
    ).toBe(true);
    expect(buildProductSummarySearchHaystack(item, 'extra')).toContain('product-005');
  });
});