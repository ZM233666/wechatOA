import type { HTMLElement } from 'node-html-parser';

export type CarouselSlideSource = {
  url: string;
  alt?: string;
};

export type CarouselHtmlPresentation = {
  slides: CarouselSlideSource[];
  autoplay?: boolean;
  intervalMs?: number;
};

function parseCarouselSlidesJson(raw: string): CarouselSlideSource[] | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const slides = parsed
      .map((item) => {
        if (typeof item === 'string' && item.trim()) {
          return { url: item.trim() };
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const url = String(record.url ?? record.src ?? '').trim();
          if (!url) {
            return null;
          }
          const alt = String(record.alt ?? record.title ?? '').trim();
          return alt ? { url, alt } : { url };
        }
        return null;
      })
      .filter((item): item is CarouselSlideSource => Boolean(item));
    return slides.length ? slides : null;
  } catch {
    return null;
  }
}

function parseAaSvgGalleryConfig(el: HTMLElement): CarouselHtmlPresentation | null {
  const hasMarker =
    el.getAttribute('data-aa-svg-gallery') != null || /\baa-svg-gallery\b/.test(el.getAttribute('class') ?? '');
  if (!hasMarker) {
    return null;
  }
  const rawConfig = el.getAttribute('data-aa-config') ?? '';
  if (rawConfig) {
    try {
      const json = JSON.parse(decodeURIComponent(rawConfig)) as Record<string, unknown>;
      const images = json.images;
      if (Array.isArray(images)) {
        const slides = images
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
          .map((url) => ({ url }));
        if (slides.length) {
          const scrollDuration = Number(json.scrollDuration ?? 6);
          const loop = json.loop !== false;
          return {
            slides,
            autoplay: loop || json.effect === 'scroll',
            intervalMs: Math.max(1000, (Number.isFinite(scrollDuration) ? scrollDuration : 6) * 1000),
          };
        }
      }
    } catch {
      // fall through to img extraction
    }
  }
  const fromImgs = dedupeSlideSources(
    el.querySelectorAll('img').map((img) => ({
      url: img.getAttribute('src') ?? '',
      alt: img.getAttribute('alt') ?? undefined,
    })),
  );
  if (!fromImgs.length) {
    return null;
  }
  return { slides: fromImgs, autoplay: true, intervalMs: 6000 };
}

export function dedupeSlideSources(sources: CarouselSlideSource[]): CarouselSlideSource[] {
  const seen = new Set<string>();
  const out: CarouselSlideSource[] = [];
  sources.forEach((item) => {
    const url = item.url.trim();
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    out.push({ url, alt: item.alt });
  });
  return out;
}

/** wangEditor / 管理端 SVG 动图图集（aa-svg-gallery）及通用轮播容器 */
export function isArticleCarouselContainer(el: HTMLElement): boolean {
  const tag = el.tagName?.toLowerCase() ?? '';
  if (tag !== 'div' && tag !== 'section') {
    return false;
  }
  if (el.getAttribute('data-aa-svg-gallery') != null) {
    return true;
  }
  const dataBlock = (el.getAttribute('data-kb-block') ?? el.getAttribute('data-wx-block') ?? '')
    .trim()
    .toLowerCase();
  if (dataBlock === 'carousel' || dataBlock === 'svg-carousel' || dataBlock === 'media-carousel') {
    return true;
  }
  const className = el.getAttribute('class') ?? '';
  return /\b(aa-svg-gallery|kb-carousel|kb-media-carousel|wx-svg-carousel)\b/.test(className);
}

export function extractCarouselPresentation(el: HTMLElement): CarouselHtmlPresentation | null {
  const aa = parseAaSvgGalleryConfig(el);
  if (aa) {
    return aa;
  }
  const jsonSlides = parseCarouselSlidesJson(el.getAttribute('data-slides') ?? '');
  const slideSources = jsonSlides
    ? jsonSlides
    : dedupeSlideSources(
        el.querySelectorAll('img').map((img) => ({
          url: img.getAttribute('src') ?? '',
          alt: img.getAttribute('alt') ?? undefined,
        })),
      );
  if (!slideSources.length) {
    return null;
  }
  const autoplayRaw = (el.getAttribute('data-autoplay') ?? '').trim().toLowerCase();
  const intervalRaw = Number(el.getAttribute('data-interval') ?? '');
  return {
    slides: slideSources,
    autoplay: autoplayRaw === 'true' || autoplayRaw === '1',
    intervalMs: Number.isFinite(intervalRaw) && intervalRaw > 0 ? intervalRaw : undefined,
  };
}
