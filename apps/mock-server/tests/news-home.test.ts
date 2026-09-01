import { describe, expect, it } from 'vitest';
import type { NewsArticleFixture } from '../src/schemas/news.schema';
import { selectHomeBanners, selectHomeNews } from '../src/services/news.service';

function makeArticle(overrides: Partial<NewsArticleFixture> & Pick<NewsArticleFixture, 'id' | 'title'>): NewsArticleFixture {
  const base: NewsArticleFixture = {
    id: overrides.id,
    slug: overrides.slug ?? overrides.id,
    status: 'published',
    language: 'zh-CN',
    title: overrides.title,
    subtitle: '',
    summary: '摘要',
    category: { id: 'general', name: '新闻' },
    author: { id: 'author-1', name: '作者', avatar: null },
    source: { name: '来源', url: null },
    coverImage: {
      url: `/mock-assets/news/${overrides.id}-cover.png`,
      alt: overrides.title,
      width: 1200,
      height: 675,
      aspectRatio: 1.7778,
    },
    tags: [],
    placement: {
      showOnHome: false,
      showOnBanner: false,
      featured: false,
      pinned: false,
      sortOrder: 0,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-02T00:00:00.000Z',
    scheduledAt: null,
    richContent: [{ type: 'paragraph', id: 'p-1', spans: [{ type: 'text', text: '正文' }] }],
    relatedArticleIds: [],
    share: {
      title: overrides.title,
      summary: '摘要',
      imageUrl: '/mock-assets/news/news-001-cover.png',
    },
  };
  return { ...base, ...overrides, placement: { ...base.placement, ...overrides.placement } };
}

describe('home news selection', () => {
  it('uses home-recommended articles for banners', () => {
    const articles = [
      makeArticle({
        id: 'news-a',
        title: '首页推荐文章',
        explicitSummary: '这是 CMS 摘要',
        placement: { pinned: false, showOnHome: true, showOnBanner: true, featured: true, sortOrder: 0 },
      }),
      makeArticle({
        id: 'news-b',
        title: '仅置顶',
        placement: { pinned: true, showOnHome: true, showOnBanner: false, featured: false, sortOrder: 0 },
      }),
    ];
    const banners = selectHomeBanners(articles);
    expect(banners).toHaveLength(1);
    expect(banners[0]?.id).toBe('news-a');
    expect(banners[0]?.newsId).toBe('news-a');
    expect(banners[0]?.description).toBe('这是 CMS 摘要');
  });

  it('omits banner description when explicit summary is missing', () => {
    const banners = selectHomeBanners([
      makeArticle({
        id: 'news-a',
        title: '首页推荐文章',
        placement: { pinned: false, showOnHome: true, showOnBanner: true, featured: true, sortOrder: 0 },
      }),
    ]);
    expect(banners[0]?.description).toBeUndefined();
  });

  it('excludes pinned-only articles from banners but includes them in latestNews by date', () => {
    const articles = [
      makeArticle({
        id: 'news-top-only',
        title: '仅置顶',
        publishedAt: '2026-01-10T00:00:00.000Z',
        placement: { pinned: true, showOnHome: false, showOnBanner: false, featured: false, sortOrder: 0 },
      }),
      makeArticle({
        id: 'news-recommended',
        title: '首页推荐',
        publishedAt: '2026-01-05T00:00:00.000Z',
        placement: { pinned: false, showOnHome: true, showOnBanner: true, featured: true, sortOrder: 0 },
      }),
    ];
    expect(selectHomeBanners(articles)).toHaveLength(1);
    expect(selectHomeBanners(articles)[0]?.id).toBe('news-recommended');
    expect(selectHomeNews(articles)).toHaveLength(2);
    expect(selectHomeNews(articles)[0]?.id).toBe('news-top-only');
    expect(selectHomeNews(articles)[1]?.id).toBe('news-recommended');
  });

  it('returns the three most recently published articles', () => {
    const articles = [
      makeArticle({ id: 'news-old', title: '较早', publishedAt: '2026-01-01T00:00:00.000Z' }),
      makeArticle({ id: 'news-newest', title: '最新', publishedAt: '2026-01-20T00:00:00.000Z' }),
      makeArticle({ id: 'news-middle', title: '中间', publishedAt: '2026-01-10T00:00:00.000Z' }),
      makeArticle({ id: 'news-extra', title: '第四条', publishedAt: '2026-01-15T00:00:00.000Z' }),
    ];
    const latest = selectHomeNews(articles);
    expect(latest.map((item) => item.id)).toEqual(['news-newest', 'news-extra', 'news-middle']);
  });

  it('excludes drafts from latestNews even when marked showOnHome', () => {
    const articles = [
      makeArticle({
        id: 'draft-1',
        title: '草稿',
        status: 'draft',
        publishedAt: null,
        placement: { showOnHome: true, pinned: false, showOnBanner: false, featured: false, sortOrder: 0 },
      }),
      makeArticle({
        id: 'news-published',
        title: '已发布',
        placement: { showOnHome: true, pinned: true, showOnBanner: true, featured: false, sortOrder: 0 },
      }),
    ];
    const latest = selectHomeNews(articles);
    expect(latest).toHaveLength(1);
    expect(latest[0]?.id).toBe('news-published');
    expect(latest[0]?.coverImage.url).toContain('news-published-cover.png');
  });
});
