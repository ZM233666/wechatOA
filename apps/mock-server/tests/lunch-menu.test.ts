import { describe, expect, it } from 'vitest';
import type { LunchMenuRow } from '../src/services/lunch-menu.client';
import { lunchMenuObjectKey, resolveLunchMenuImage } from '../src/services/lunch-menu.media';
import { mapLunchMenuRow } from '../src/services/lunch-menu.mapper';

const published: LunchMenuRow = {
  id: 2,
  campus: 'suzhou',
  menu_date: '2026-09-22',
  title: '今日午餐',
  cover_image:
    'http://218.78.140.89:9000/wechat-official-account/lunch-menu/2026-09-22/cover.jpg?X-Amz-Signature=abc',
  status: 'published',
  content: {
    modules: [
      {
        id: 'draft-only',
        type: 'combo',
        enabled: true,
        order: 1,
        list_text: '草稿不应展示',
        images: [],
      },
    ],
  },
  published_content: {
    modules: [
      {
        id: 'combo-1',
        type: 'combo',
        enabled: true,
        order: 1,
        list_text: '红烧肉，青菜，排骨',
        images: [
          'http://218.78.140.89:9000/wechat-official-account/lunch-menu/2026-09-22/a.jpg?X-Amz-Signature=1',
        ],
      },
      {
        id: 'empty',
        type: 'special',
        enabled: true,
        order: 2,
        list_text: '   ',
        images: [],
      },
      {
        id: 'hidden',
        type: 'noodle',
        enabled: false,
        order: 3,
        list_text: '隐藏面档',
        images: ['http://example.com/noodle.jpg'],
      },
      {
        id: 'bread',
        type: 'bread_booking',
        enabled: true,
        order: 4,
        image: 'http://218.78.140.89:9000/wechat-official-account/media/files/bread.jpg',
      },
    ],
  },
};

describe('lunch menu mapper', () => {
  it('falls back to content when published_content is missing', () => {
    const menu = mapLunchMenuRow({
      ...published,
      published_content: null,
      content: published.published_content,
    });
    expect(menu?.sections.length).toBeGreaterThan(0);
  });

  it('uses the published snapshot and drops empty or disabled modules', () => {
    const menu = mapLunchMenuRow(published);
    expect(menu?.menuDate).toBe('2026-09-22');
    expect(menu?.sections.map((item) => item.title)).toEqual(['套餐', '面包预约']);
    expect(menu?.sections[0]?.text).toBe('红烧肉，青菜，排骨');
    expect(menu?.sections[0]?.imageUrls).toHaveLength(1);
    expect(menu?.sections[1]?.imageUrls[0]).toContain('/media/files/bread.jpg');
  });

  it('ignores unpublished rows', () => {
    expect(mapLunchMenuRow({ ...published, status: 'draft' })).toBeNull();
    expect(mapLunchMenuRow({ ...published, id: null })).toBeNull();
  });

  it('does not block on uncached remote images', () => {
    const remote =
      'http://218.78.140.89:9000/wechat-official-account/lunch-menu/2026-09-22/cover.jpg?X-Amz-Signature=abc';
    const started = Date.now();
    expect(resolveLunchMenuImage(remote)).toBe(remote);
    expect(Date.now() - started).toBeLessThan(50);
  });

  it('strips the bucket and query from MinIO urls', () => {
    expect(
      lunchMenuObjectKey(
        'http://218.78.140.89:9000/wechat-official-account/lunch-menu/2026-09-22/20260923_%E5%BE%AE%E4%BF%A1.jpg?X-Amz-Signature=abc',
      ),
    ).toBe('lunch-menu/2026-09-22/20260923_微信.jpg');
  });
});
