import type { ArticleContentBlock } from '@app/shared';
import type { z } from 'zod';
import type { productSummarySchema } from '../schemas/product.schema';
import { getFixtures } from './fixture.service';
import {
  isProductIntroEnabled,
  PRODUCT_INTRO_SYSTEMS,
  type ProductIntroDetailItem,
} from './product-intro.client';
import { getCachedSystemProducts } from './product-intro.service';
import { matchesKeyword } from '../utils/query';

type ProductSummary = z.infer<typeof productSummarySchema>;

function flattenDetailItems(items?: ProductIntroDetailItem[]): string {
  if (!items?.length) {
    return '';
  }
  return items.map((item) => `${item.title ?? ''} ${item.content ?? ''}`).join(' ');
}

function flattenRichContent(blocks: ArticleContentBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
      case 'quote':
        parts.push(block.text);
        break;
      case 'callout':
        parts.push(block.title ?? '', block.text);
        break;
      case 'paragraph':
        parts.push(...block.spans.map((span) => span.text));
        break;
      case 'list':
        parts.push(...block.items);
        break;
      case 'link':
        parts.push(block.text);
        break;
      case 'image':
        if (block.caption) {
          parts.push(block.caption);
        }
        break;
      case 'carousel':
        if (block.caption) {
          parts.push(block.caption);
        }
        break;
      default:
        break;
    }
  }
  return parts.join(' ');
}

export function buildProductSearchExtraIndex(): Map<string, string> {
  const map = new Map<string, string>();
  if (isProductIntroEnabled()) {
    for (const system of PRODUCT_INTRO_SYSTEMS) {
      for (const row of getCachedSystemProducts(system.slug)) {
        const extra = [row.product_no, flattenDetailItems(row.detail_items)].filter(Boolean).join(' ');
        if (extra) {
          map.set(String(row.id), extra);
        }
      }
    }
    return map;
  }

  const fixtures = getFixtures();
  for (const detail of fixtures.productDetails) {
    const extra = [
      detail.slug,
      detail.description,
      detail.subtitleEn,
      ...detail.relatedProducts.map((item) => `${item.name} ${item.description}`),
      flattenRichContent(detail.richContent),
    ]
      .filter(Boolean)
      .join(' ');
    if (extra) {
      map.set(detail.id, extra);
    }
  }
  return map;
}

export function buildProductSummarySearchHaystack(item: ProductSummary, extraText = ''): string {
  return [
    item.id,
    item.productNo,
    item.name,
    item.nameCn,
    item.summary,
    item.category.id,
    item.category.name,
    extraText,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function productSummaryMatchesKeyword(
  item: ProductSummary,
  keyword: string | undefined,
  extraText = '',
): boolean {
  return matchesKeyword(buildProductSummarySearchHaystack(item, extraText), keyword);
}