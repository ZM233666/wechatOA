import type { HTMLElement } from 'node-html-parser';

export type CarouselSlideSource = {
  url: string;
  alt?: string;
};

export type CarouselHtmlPresentation = {
  slides: CarouselSlideSource[];
  autoplay?: boolean;
  intervalMs?: number;
  loop?: boolean;
};

/** 与小程序 article-renderer 默认一致 */
export const DEFAULT_CAROUSEL_INTERVAL_MS = 2000;
export const DEFAULT_CAROUSEL_LOOP = true;

function parseDataBooleanAttribute(el: HTMLElement, name: string): boolean | undefined {
  const raw = (el.getAttribute(name) ?? '').trim().toLowerCase();
  if (!raw) {
    return undefined;
  }
  if (raw === 'true' || raw === '1' || raw === 'yes') {
    return true;
  }
  if (raw === 'false' || raw === '0' || raw === 'no') {
    return false;
  }
  return undefined;
}

/** `data-loop` 优先于 `data-circular`（均映射小程序 swiper circular） */
export function parseDataLoopAttribute(el: HTMLElement): boolean | undefined {
  const fromLoop = parseDataBooleanAttribute(el, 'data-loop');
  if (fromLoop !== undefined) {
    return fromLoop;
  }
  return parseDataBooleanAttribute(el, 'data-circular');
}

export function loopFromAaConfig(json: Record<string, unknown>): boolean | undefined {
  if (typeof json.loop === 'boolean') {
    return json.loop;
  }
  return undefined;
}

export function resolveCarouselLoop(
  el: HTMLElement,
  configJson?: Record<string, unknown>,
): boolean {
  return (
    parseDataLoopAttribute(el) ??
    (configJson ? loopFromAaConfig(configJson) : undefined) ??
    DEFAULT_CAROUSEL_LOOP
  );
}

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

export function parseDataIntervalAttribute(el: HTMLElement): number | undefined {
  const intervalRaw = Number(el.getAttribute('data-interval') ?? '');
  if (Number.isFinite(intervalRaw) && intervalRaw > 0) {
    return Math.round(intervalRaw);
  }
  return undefined;
}

/** 从 aa-svg-gallery 的 data-aa-config JSON 解析停留时长（一律毫秒） */
export function intervalMsFromAaConfig(json: Record<string, unknown>): number | undefined {
  const candidates = [json.intervalMs, json.interval, json.scrollDuration];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
  }
  return undefined;
}

export function resolveCarouselIntervalMs(
  el: HTMLElement,
  configJson?: Record<string, unknown>,
): number {
  return (
    parseDataIntervalAttribute(el) ??
    (configJson ? intervalMsFromAaConfig(configJson) : undefined) ??
    DEFAULT_CAROUSEL_INTERVAL_MS
  );
}

/** aa-svg-gallery：autoplay 与 loop 独立；未写 autoplay 时保留旧稿 loop/effect 推断 */
function resolveAaGalleryAutoplay(el: HTMLElement, json: Record<string, unknown>): boolean {
  const fromAttr = parseDataBooleanAttribute(el, 'data-autoplay');
  if (fromAttr !== undefined) {
    return fromAttr;
  }
  if (typeof json.autoplay === 'boolean') {
    return json.autoplay;
  }
  return json.loop !== false || json.effect === 'scroll';
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
          const loop = resolveCarouselLoop(el, json);
          const slideSources = loop ? dedupeSlideSources(slides) : slides;
          return {
            slides: slideSources,
            autoplay: resolveAaGalleryAutoplay(el, json),
            intervalMs: resolveCarouselIntervalMs(el, json),
            loop,
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
  return {
    slides: fromImgs,
    autoplay: true,
    intervalMs: resolveCarouselIntervalMs(el),
    loop: resolveCarouselLoop(el),
  };
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
  const autoplayAttr = parseDataBooleanAttribute(el, 'data-autoplay');
  const intervalMs = parseDataIntervalAttribute(el);
  return {
    slides: slideSources,
    autoplay: autoplayAttr === true,
    intervalMs,
    loop: resolveCarouselLoop(el),
  };
}
