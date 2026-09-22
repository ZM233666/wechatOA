import { describe, expect, it } from 'vitest';
import {
  mapProductIntroRowToDetail,
  mapProductIntroRowToSummary,
  mapSystemProductsToCategoriesData,
  mapSystemProductsToDetail,
} from '../src/services/product-intro.mapper';
import { loadFixtures } from '../src/services/fixture.service';

describe('product-intro.mapper', () => {
  it('maps row to public summary with absolute cover url', () => {
    const summary = mapProductIntroRowToSummary(
      {
        id: 1,
        product_name: 'test01',
        product_no: 'KB-001',
        summary: '制动产品简介',
        category: 'braking',
        cover_url: '/media/products/cover.jpg',
        is_core_product: true,
        publish_time: '2026-01-01 08:00:00',
        update_datetime: '2026-01-02 08:00:00',
      },
      'http://127.0.0.1:8000',
    );
    expect(summary.productName).toBe('test01');
    expect(summary.coverUrl).toBe('http://127.0.0.1:8000/media/products/cover.jpg');
    expect(summary.isCoreProduct).toBe(true);
  });

  it('uses is_top product cover for category tile', () => {
    const fixtures = loadFixtures();
    const data = mapSystemProductsToCategoriesData(
      {
        braking: [
          {
            id: 1,
            product_name: 'Core Product',
            summary: '核心产品',
            cover_url: '/media/core.jpg',
            is_core_product: true,
            is_top: false,
          },
          {
            id: 2,
            product_name: 'Top Product',
            summary: '置顶产品',
            cover_url: '/media/top.jpg',
            is_core_product: false,
            is_top: true,
          },
        ],
      },
      'http://127.0.0.1:8000',
      fixtures.productCategories,
    );
    expect(data.categories[0].coverImage.url).toBe('http://127.0.0.1:8000/media/top.jpg');
    expect(data.categories[0].description).toBe('置顶产品');
  });

  it('maps system products to legacy categories shape', () => {
    const fixtures = loadFixtures();
    const data = mapSystemProductsToCategoriesData(
      {
        braking: [
          {
            id: 1,
            product_name: 'test01',
            summary: '简介',
            cover_url: '/media/cover.jpg',
            is_core_product: true,
            is_top: true,
          },
        ],
      },
      'http://127.0.0.1:8000',
      fixtures.productCategories,
    );
    expect(data.categories[0].id).toBe('braking');
    expect(data.categories[0].featuredProductId).toBe('braking');
    expect(data.categories[0].coverImage.url).toContain('/media/cover.jpg');
  });

  it('leaves category cover empty when system has no is_top product', () => {
    const fixtures = loadFixtures();
    const data = mapSystemProductsToCategoriesData(
      {
        door: [
          {
            id: 10,
            product_name: 'Door Product',
            summary: '门产品',
            cover_url: '/media/door.jpg',
            is_core_product: true,
            is_top: false,
          },
        ],
      },
      'http://127.0.0.1:8000',
      fixtures.productCategories,
    );
    const door = data.categories.find((item) => item.id === 'door');
    expect(door?.coverImage.url).toBe('');
    expect(door?.description).toBe(' ');
  });

  it('maps detail hero from is_top product not core product', () => {
    const detail = mapSystemProductsToDetail(
      'braking',
      [
        {
          id: 1,
          product_name: 'Core Product',
          summary: '核心简介',
          cover_url: '/media/core.jpg',
          is_core_product: true,
          is_top: false,
        },
        {
          id: 2,
          product_name: 'Top Product',
          summary: '置顶简介',
          cover_url: '/media/top.jpg',
          is_core_product: false,
          is_top: true,
          detail_items: [{ title: 'Spec', content: 'Value' }],
        },
      ],
      'http://127.0.0.1:8000',
    );
    expect(detail.name).toBe('Top Product');
    expect(detail.summary).toBe('置顶简介');
    expect(detail.description).toContain('置顶简介');
    expect(detail.description).toContain('Spec: Value');
    expect(detail.coverImage.url).toBe('http://127.0.0.1:8000/media/top.jpg');
  });

  it('maps system products to legacy detail with related core products', () => {
    const detail = mapSystemProductsToDetail(
      'braking',
      [
        {
          id: 1,
          product_name: 'Core A',
          summary: 'A summary',
          is_core_product: true,
          detail_items: [{ title: 'Spec', content: 'Value' }],
        },
        {
          id: 2,
          product_name: 'Core B',
          summary: 'B summary',
          is_core_product: true,
        },
      ],
      'http://127.0.0.1:8000',
    );
    expect(detail.id).toBe('braking');
    expect(detail.relatedProducts).toHaveLength(2);
    expect(detail.relatedProducts[0].description).toContain('Spec: Value');
  });

  it('shows only is_core_product items in Core Products list', () => {
    const detail = mapSystemProductsToDetail(
      'braking',
      [
        {
          id: 1,
          product_name: 'Top Only',
          summary: '置顶',
          is_top: true,
          is_core_product: false,
        },
        {
          id: 2,
          product_name: 'Core Only',
          summary: '核心',
          is_top: false,
          is_core_product: true,
        },
      ],
      'http://127.0.0.1:8000',
    );
    expect(detail.name).toBe('Top Only');
    expect(detail.relatedProducts).toHaveLength(1);
    expect(detail.relatedProducts[0].name).toBe('Core Only');
  });

  it('maps detail items on public detail', () => {
    const detail = mapProductIntroRowToDetail(
      {
        id: 3,
        product_name: 'Item',
        detail_items: [{ title: 'Weight', content: '12kg' }],
      },
      'http://127.0.0.1:8000',
    );
    expect(detail.detailItems).toEqual([{ title: 'Weight', content: '12kg' }]);
  });
});
