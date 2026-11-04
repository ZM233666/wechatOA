import { describe, expect, it } from 'vitest';
import { selectKbLifeCareBannersFromMini } from '../src/services/kb-life-banner.service';

describe('selectKbLifeCareBannersFromMini', () => {
  it('merges local and global pinned banners for KB Life swiper', () => {
    const article = (id: number, track: string, title: string, pinned = true) => ({
      id,
      track,
      title,
      contentHtml: '<p>x</p>',
      publishedAt: `2026-11-0${id}T00:00:00+08:00`,
      showOnKbLifeBanner: pinned,
      coverImage: { url: '/media/c.jpg', alt: '' },
    });

    const banners = selectKbLifeCareBannersFromMini({
      campus: 'suzhou',
      local: {
        banner: [article(1, 'local', 'Local pinned')],
        articles: [article(1, 'local', 'Local pinned'), article(2, 'local', 'Local list only', false)],
      },
      global: {
        banner: [article(3, 'global', 'Global pinned')],
        articles: [article(3, 'global', 'Global pinned')],
      },
    });

    expect(banners.map((b) => b.title).sort()).toEqual(['Global pinned', 'Local pinned']);
  });

  it('drops unpublished banner items that are no longer in articles', () => {
    const live = {
      id: 1,
      track: 'local',
      title: 'Live',
      contentHtml: '<p>x</p>',
      publishedAt: '2026-11-04T00:00:00+08:00',
      showOnKbLifeBanner: true,
      coverImage: { url: '/media/c.jpg', alt: '' },
    };
    const offline = {
      ...live,
      id: 3,
      track: 'global',
      title: 'Offline',
    };
    const banners = selectKbLifeCareBannersFromMini({
      campus: 'suzhou',
      local: { banner: [live], articles: [live] },
      global: { banner: [offline], articles: [] },
    });
    expect(banners.map((item) => item.title)).toEqual(['Live']);
  });
});
