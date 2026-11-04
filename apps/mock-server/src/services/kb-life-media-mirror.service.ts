import type {
  ArticleContentBlock,
  EmployeeCareData,
  HighlightMomentsAlbum,
  HighlightMomentsDetail,
  KbLifeBanner,
} from '@app/shared';
import { mockEnv } from '../config/env';
import { logWarn } from '../utils/logger';
import { mirrorRemoteMediaUrl } from './article-media-mirror.service';
import {
  resolveEmployeeCareArticleDetail,
  type EmployeeCareArticleDetail,
} from './local-global-care-detail.service';

const MIRROR_CONCURRENCY = 4;

async function mapPool<T, R>(items: T[], mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (!items.length) {
    return [];
  }
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index] as T, index);
    }
  };
  const pool = Math.min(MIRROR_CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}

async function mirrorImage(
  scope: string,
  url: string,
  index: number,
  mediaBaseUrl: string,
): Promise<string> {
  const trimmed = (url || '').trim();
  if (!trimmed || trimmed.startsWith('/mock-assets/')) {
    return trimmed;
  }
  const mirrored = await mirrorRemoteMediaUrl(scope, trimmed, {
    mediaBaseUrl,
    kind: 'image',
    index,
  });
  return mirrored.startsWith('/mock-assets/') ? mirrored : trimmed;
}

function highlightMediaBase(): string {
  return mockEnv.HIGHLIGHT_MOMENTS_API_BASE_URL || mockEnv.LOCAL_GLOBAL_CARE_MEDIA_BASE_URL;
}

async function hydrateAlbum(
  album: HighlightMomentsAlbum,
  options: { includeImages: boolean },
): Promise<HighlightMomentsAlbum> {
  const mediaBase = highlightMediaBase();
  const coverUrl = await mirrorImage(`highlight-${album.id}`, album.coverImage.url, 0, mediaBase);
  if (!options.includeImages) {
    return {
      ...album,
      coverImage: { ...album.coverImage, url: coverUrl },
    };
  }
  const images = await mapPool(album.images, async (image, index) => ({
    ...image,
    url: await mirrorImage(`highlight-${album.id}`, image.url, index + 1, mediaBase),
  }));
  return {
    ...album,
    coverImage: { ...album.coverImage, url: coverUrl },
    images,
  };
}

export async function hydrateHighlightMomentsMedia(
  data: HighlightMomentsDetail,
  options?: { mode?: 'covers' | 'full' },
): Promise<HighlightMomentsDetail> {
  const includeImages = options?.mode !== 'covers';
  const albums = await mapPool(data.albums, (album) => hydrateAlbum(album, { includeImages }));
  return { ...data, albums };
}

export async function hydrateHighlightMomentsAlbum(
  album: HighlightMomentsAlbum,
): Promise<HighlightMomentsAlbum> {
  return hydrateAlbum(album, { includeImages: true });
}

export function prewarmHighlightMomentsMedia(data: HighlightMomentsDetail): void {
  void hydrateHighlightMomentsMedia(data, { mode: 'full' }).catch((error: unknown) => {
    logWarn('Highlight moments media prewarm failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  });
}

export async function hydrateEmployeeCareMedia(data: EmployeeCareData): Promise<EmployeeCareData> {
  const mediaBase = mockEnv.LOCAL_GLOBAL_CARE_MEDIA_BASE_URL;
  const initiatives = await mapPool(data.initiatives, async (item, index) => {
    if (!item.image?.url) {
      return item;
    }
    const url = await mirrorImage(item.id, item.image.url, index, mediaBase);
    return { ...item, image: { ...item.image, url } };
  });
  const heroUrl = data.hero.image.url;
  const mirroredHero = await mirrorImage('care-hero', heroUrl, 0, mediaBase);
  return {
    ...data,
    hero: { ...data.hero, image: { ...data.hero.image, url: mirroredHero } },
    initiatives,
  };
}

export async function hydrateKbLifeBanners(banners: KbLifeBanner[]): Promise<KbLifeBanner[]> {
  const mediaBase = mockEnv.LOCAL_GLOBAL_CARE_MEDIA_BASE_URL;
  return mapPool(banners, async (banner, index) => ({
    ...banner,
    image: {
      ...banner.image,
      url: await mirrorImage(`kb-banner-${banner.id}`, banner.image.url, index, mediaBase),
    },
  }));
}

async function rewriteHtmlImageSrcs(
  html: string,
  scope: string,
  mediaBase: string,
): Promise<string> {
  if (!html) {
    return html;
  }
  const sources = [
    ...new Set([...html.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)].map((match) => match[1] ?? '')),
  ].filter(Boolean);
  if (!sources.length) {
    return html;
  }
  const rewritten = new Map<string, string>();
  await mapPool(sources, async (src, index) => {
    rewritten.set(src, await mirrorImage(scope, src, index + 1, mediaBase));
  });
  return html.replace(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi, (full, src: string) =>
    full.replace(src, rewritten.get(src) ?? src),
  );
}

async function hydrateRichContentBlocks(
  articleId: string,
  blocks: ArticleContentBlock[] | undefined,
  mediaBase: string,
): Promise<ArticleContentBlock[] | undefined> {
  if (!blocks?.length) {
    return blocks;
  }
  let nextIndex = 0;
  const jobs = blocks.map((block) => {
    if (block.type === 'image' && block.image?.url) {
      const index = nextIndex;
      nextIndex += 1;
      return { block, kind: 'image' as const, index };
    }
    if (block.type === 'carousel') {
      const index = nextIndex;
      nextIndex += block.slides.length;
      return { block, kind: 'carousel' as const, index };
    }
    if (block.type === 'video') {
      const index = nextIndex;
      nextIndex += block.poster ? 2 : 1;
      return { block, kind: 'video' as const, index };
    }
    return { block, kind: 'other' as const, index: nextIndex };
  });
  return mapPool(jobs, async (job) => {
    const { block, kind, index } = job;
    if (kind === 'image' && block.type === 'image') {
      const url = await mirrorImage(articleId, block.image.url, index, mediaBase);
      return { ...block, image: { ...block.image, url } };
    }
    if (kind === 'carousel' && block.type === 'carousel') {
      const slides = await mapPool(block.slides, async (slide, slideIndex) => ({
        ...slide,
        url: await mirrorImage(articleId, slide.url, index + slideIndex, mediaBase),
      }));
      return { ...block, slides };
    }
    if (kind === 'video' && block.type === 'video') {
      const src = await mirrorImage(articleId, block.src, index, mediaBase);
      const poster = block.poster
        ? await mirrorImage(articleId, block.poster, index + 1, mediaBase)
        : undefined;
      return { ...block, src, ...(poster ? { poster } : {}) };
    }
    return block;
  });
}

export async function hydrateCareArticleDetail(
  detail: EmployeeCareArticleDetail,
): Promise<EmployeeCareArticleDetail> {
  const mediaBase = mockEnv.LOCAL_GLOBAL_CARE_MEDIA_BASE_URL;
  const hasNativeBlocks = (detail.richContent ?? []).some(
    (block) => block.type === 'carousel' || block.type === 'video',
  );
  const [coverUrl, contentHtml, richContent] = await Promise.all([
    detail.coverImage?.url
      ? mirrorImage(detail.id, detail.coverImage.url, 0, mediaBase)
      : Promise.resolve(''),
    hasNativeBlocks
      ? Promise.resolve(detail.contentHtml)
      : rewriteHtmlImageSrcs(detail.contentHtml, detail.id, mediaBase),
    hydrateRichContentBlocks(detail.id, detail.richContent, mediaBase),
  ]);
  return {
    ...detail,
    ...(detail.coverImage && coverUrl
      ? { coverImage: { ...detail.coverImage, url: coverUrl } }
      : {}),
    contentHtml,
    ...(richContent ? { richContent } : {}),
  };
}

const CARE_DETAIL_TTL_MS = 5 * 60_000;
const careDetailCache = new Map<string, { at: number; data: EmployeeCareArticleDetail }>();
const careDetailInFlight = new Map<string, Promise<EmployeeCareArticleDetail | null>>();

export async function loadHydratedCareArticleDetail(
  routeId: string,
  campus: string,
  options?: { force?: boolean },
): Promise<EmployeeCareArticleDetail | null> {
  if (!options?.force) {
    const cached = careDetailCache.get(routeId);
    if (cached && Date.now() - cached.at < CARE_DETAIL_TTL_MS) {
      return cached.data;
    }
    const pending = careDetailInFlight.get(routeId);
    if (pending) {
      return pending;
    }
  }
  const run = (async () => {
    const detail = await resolveEmployeeCareArticleDetail(routeId, campus);
    if (!detail) {
      return null;
    }
    const hydrated = await hydrateCareArticleDetail(detail);
    const entry = { at: Date.now(), data: hydrated };
    careDetailCache.set(routeId, entry);
    if (hydrated.id !== routeId) {
      careDetailCache.set(hydrated.id, entry);
    }
    return hydrated;
  })().finally(() => {
    careDetailInFlight.delete(routeId);
  });
  careDetailInFlight.set(routeId, run);
  return run;
}

export function invalidateHydratedCareArticleDetails(): void {
  careDetailCache.clear();
}

export function prewarmCareArticleDetails(routeIds: string[], campus: string): void {
  const ids = [...new Set(routeIds.map((id) => id.trim()).filter(Boolean))].slice(0, 5);
  if (!ids.length) {
    return;
  }
  void (async () => {
    for (const id of ids) {
      try {
        await loadHydratedCareArticleDetail(id, campus);
      } catch (error: unknown) {
        logWarn('Care article detail prewarm failed', {
          id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  })();
}
