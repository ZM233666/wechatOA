import { describe, expect, it } from 'vitest';
import {
  mapMiniArticleToDetail,
  parseCareArticleRouteId,
} from '../src/services/local-global-care-detail.service';
import {
  getCachedMiniCareArticle,
  rememberMiniCareArticles,
} from '../src/services/local-global-care.service';

describe('parseCareArticleRouteId', () => {
  it('parses prefixed initiative ids', () => {
    expect(parseCareArticleRouteId('care-local-12')).toBe(12);
    expect(parseCareArticleRouteId('care-global-3')).toBe(3);
  });

  it('parses numeric ids', () => {
    expect(parseCareArticleRouteId('12')).toBe(12);
  });
});

describe('mapMiniArticleToDetail', () => {
  it('maps CMS carousel HTML to richContent carousel instead of tiled images', () => {
    const detail = mapMiniArticleToDetail({
      id: 3,
      track: 'global',
      title: '全球关怀Test',
      publishedAt: '2026-11-04T00:00:00Z',
      showOnKbLifeBanner: false,
      contentHtml: `
        <p>你好，这是一篇全球关怀的test文章 。。。</p>
        <section class="aa-svg-gallery" data-aa-svg-gallery="1">
          <img src="https://cdn.example.com/train.jpg" alt="列车" />
          <img src="https://cdn.example.com/tracks.jpg" alt="轨道" />
        </section>
      `,
    });

    const carousel = detail.richContent?.find((block) => block.type === 'carousel');
    expect(carousel?.type).toBe('carousel');
    if (!carousel || carousel.type !== 'carousel') {
      return;
    }
    expect(carousel.slides).toHaveLength(2);
    expect(carousel.slides.map((slide) => slide.url)).toEqual([
      'https://cdn.example.com/train.jpg',
      'https://cdn.example.com/tracks.jpg',
    ]);
    expect(detail.contentHtml).toContain('全球关怀');
    expect(detail.contentHtml).not.toContain('aa-svg-gallery');
    expect(detail.contentHtml).not.toContain('<img');
  });

  it('maps backend author next to the article date', () => {
    const detail = mapMiniArticleToDetail({
      id: 3,
      track: 'global',
      title: '全球关怀Test',
      publishedAt: '2026-11-04T00:00:00Z',
      showOnKbLifeBanner: false,
      author: '张三',
      contentHtml: '<p>你好</p>',
    });
    expect(detail.author).toBe('张三');
    expect(detail.date).toBe('2026-11-04');
  });
});

describe('mini care article cache', () => {
  it('remembers list payload so detail can skip a second Django fetch', () => {
    rememberMiniCareArticles([
      {
        id: 3,
        track: 'global',
        title: '全球关怀Test',
        contentHtml: '<p>cached</p>',
        publishedAt: '2026-11-04T00:00:00Z',
        showOnKbLifeBanner: false,
      },
    ]);
    expect(getCachedMiniCareArticle(3)?.contentHtml).toBe('<p>cached</p>');
  });

  it('replace drops unpublished articles from the list snapshot', () => {
    rememberMiniCareArticles(
      [
        {
          id: 3,
          track: 'global',
          title: '旧稿',
          contentHtml: '<p>old</p>',
          publishedAt: '2026-11-04T00:00:00Z',
          showOnKbLifeBanner: false,
        },
      ],
      { replace: true },
    );
    rememberMiniCareArticles(
      [
        {
          id: 8,
          track: 'global',
          title: '新稿',
          contentHtml: '<p>new</p>',
          publishedAt: '2026-11-04T12:00:00Z',
          showOnKbLifeBanner: false,
        },
      ],
      { replace: true },
    );
    expect(getCachedMiniCareArticle(3)).toBeUndefined();
    expect(getCachedMiniCareArticle(8)?.title).toBe('新稿');
  });
});
