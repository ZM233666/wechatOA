import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HighlightMomentsDetail } from '@app/shared';

vi.mock('../src/services/article-media-mirror.service', () => ({
  mirrorRemoteMediaUrl: vi.fn(),
}));

import { mirrorRemoteMediaUrl } from '../src/services/article-media-mirror.service';
import {
  hydrateCareArticleDetail,
  hydrateHighlightMomentsAlbum,
  hydrateHighlightMomentsMedia,
} from '../src/services/kb-life-media-mirror.service';

function sampleHighlights(): HighlightMomentsDetail {
  return {
    title: 'Highlights',
    subtitle: '',
    albums: [
      {
        id: 'album-1',
        title: 'Album 1',
        subtitle: '',
        content: 'body',
        dateLabel: '2026-11',
        coverImage: {
          url: 'https://minio.example/cover-1.jpg',
          alt: 'cover',
          width: 400,
          height: 300,
          aspectRatio: 1.33,
        },
        images: [
          {
            url: 'https://minio.example/a.jpg',
            alt: 'a',
            width: 400,
            height: 300,
            aspectRatio: 1.33,
            allowDownload: false,
          },
          {
            url: 'https://minio.example/b.jpg',
            alt: 'b',
            width: 400,
            height: 300,
            aspectRatio: 1.33,
            allowDownload: true,
          },
        ],
      },
    ],
  };
}

describe('hydrateHighlightMomentsMedia', () => {
  beforeEach(() => {
    vi.mocked(mirrorRemoteMediaUrl).mockReset();
    vi.mocked(mirrorRemoteMediaUrl).mockImplementation(async (_scope, src) => {
      const name = src.split('/').pop() ?? 'img';
      return `/mock-assets/mirrored/${name}`;
    });
  });

  it('covers mode only mirrors album covers', async () => {
    const hydrated = await hydrateHighlightMomentsMedia(sampleHighlights(), { mode: 'covers' });
    const sources = vi.mocked(mirrorRemoteMediaUrl).mock.calls.map((call) => call[1]);
    expect(sources).toEqual(['https://minio.example/cover-1.jpg']);
    expect(hydrated.albums[0]?.coverImage.url).toBe('/mock-assets/mirrored/cover-1.jpg');
    expect(hydrated.albums[0]?.images.map((item) => item.url)).toEqual([
      'https://minio.example/a.jpg',
      'https://minio.example/b.jpg',
    ]);
  });

  it('album hydrate mirrors cover and photos', async () => {
    const album = sampleHighlights().albums[0];
    expect(album).toBeDefined();
    const hydrated = await hydrateHighlightMomentsAlbum(album!);
    const sources = vi.mocked(mirrorRemoteMediaUrl).mock.calls.map((call) => call[1]);
    expect(sources).toEqual([
      'https://minio.example/cover-1.jpg',
      'https://minio.example/a.jpg',
      'https://minio.example/b.jpg',
    ]);
    expect(hydrated.images.every((item) => item.url.startsWith('/mock-assets/'))).toBe(true);
  });
});

describe('hydrateCareArticleDetail', () => {
  beforeEach(() => {
    vi.mocked(mirrorRemoteMediaUrl).mockReset();
    vi.mocked(mirrorRemoteMediaUrl).mockImplementation(async (_scope, src) => {
      const name = src.split('/').pop() ?? 'img';
      return `/mock-assets/mirrored/${name}`;
    });
  });

  it('mirrors carousel slide urls in richContent', async () => {
    const hydrated = await hydrateCareArticleDetail({
      id: 'care-global-3',
      title: '全球关怀Test',
      category: 'Global Care',
      date: '2026-11-04',
      contentHtml: '<p>你好</p>',
      richContent: [
        {
          id: 'c1',
          type: 'carousel',
          slides: [
            {
              url: 'https://minio.example/train.jpg',
              alt: '列车',
              width: 1200,
              height: 675,
              aspectRatio: 1.7778,
            },
            {
              url: 'https://minio.example/tracks.jpg',
              alt: '轨道',
              width: 1200,
              height: 675,
              aspectRatio: 1.7778,
            },
          ],
          autoplay: true,
          interval: 2000,
          loop: true,
        },
      ],
    });
    const carousel = hydrated.richContent?.find((block) => block.type === 'carousel');
    expect(carousel && carousel.type === 'carousel' ? carousel.slides.map((slide) => slide.url) : []).toEqual([
      '/mock-assets/mirrored/train.jpg',
      '/mock-assets/mirrored/tracks.jpg',
    ]);
  });
});
