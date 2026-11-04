import { describe, expect, it } from 'vitest';
import {
  collectMiniCareArticles,
  mapMiniLocalGlobalCareToEmployeeCare,
  resolveCareArticleAuthor,
} from '../src/services/local-global-care-mini.mapper';

describe('mapMiniLocalGlobalCareToEmployeeCare', () => {
  it('maps published articles and banner flag', () => {
    const data = mapMiniLocalGlobalCareToEmployeeCare({
      campus: 'suzhou',
      local: {
        banner: [],
        articles: [
          {
            id: 12,
            track: 'local',
            title: 'Banner 稿',
            contentHtml: '<p>hello care</p>',
            publishedAt: '2026-11-01T10:00:00+08:00',
            showOnKbLifeBanner: true,
            coverImage: { url: '/media/cover.jpg', alt: '' },
          },
        ],
      },
      global: { banner: [], articles: [] },
    });

    expect(data.initiatives).toHaveLength(1);
    expect(data.initiatives[0]?.id).toBe('care-local-12');
    expect(data.initiatives[0]?.showOnKbLifeBanner).toBe(true);
    expect(data.hero.title).not.toBe('Banner 稿');
    expect(data.initiatives[0]?.title).toBe('Banner 稿');
  });

  it('omits initiative image when CMS cover is missing', () => {
    const data = mapMiniLocalGlobalCareToEmployeeCare({
      campus: 'suzhou',
      local: {
        banner: [],
        articles: [
          {
            id: 9,
            track: 'local',
            title: '无封面',
            contentHtml: '<p>正文</p>',
            publishedAt: '2026-11-04T00:00:00+08:00',
            showOnKbLifeBanner: false,
            coverImage: null,
          },
        ],
      },
      global: { banner: [], articles: [] },
    });
    expect(data.initiatives[0]?.image).toBeUndefined();
  });

  it('collects unique articles including banner entries', () => {
    const articles = collectMiniCareArticles({
      campus: 'suzhou',
      local: {
        banner: [
          {
            id: 12,
            track: 'local',
            title: 'Banner',
            contentHtml: '<p>banner</p>',
            publishedAt: '2026-11-01T00:00:00Z',
            showOnKbLifeBanner: true,
          },
        ],
        articles: [
          {
            id: 12,
            track: 'local',
            title: 'Banner',
            contentHtml: '<p>banner</p>',
            publishedAt: '2026-11-01T00:00:00Z',
            showOnKbLifeBanner: true,
          },
        ],
      },
      global: {
        banner: [],
        articles: [
          {
            id: 3,
            track: 'global',
            title: '全球关怀Test',
            contentHtml: '<p>hello</p>',
            publishedAt: '2026-11-04T00:00:00Z',
            showOnKbLifeBanner: false,
          },
        ],
      },
    });
    expect(articles.map((item) => item.id)).toEqual([12, 3]);
  });
});

describe('resolveCareArticleAuthor', () => {
  it('trims Mini author from Django creator name', () => {
    expect(
      resolveCareArticleAuthor({
        id: 3,
        track: 'global',
        title: '全球关怀Test',
        contentHtml: '<p>x</p>',
        publishedAt: '2026-11-04T00:00:00Z',
        showOnKbLifeBanner: false,
        author: '  张三  ',
      }),
    ).toBe('张三');
  });
});
