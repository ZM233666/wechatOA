import { normalizeCarouselIntervalMs } from '../../../constants/design';
import { getApiBaseUrl } from '../../../config/env';
import { absolutizeMediaUrl } from '../../../utils/format';

const IMG_FIT_STYLE = 'max-width:100%;width:100%;height:auto;display:block;margin:12px 0';
const TABLE_FIT_STYLE = 'max-width:100%;width:100%;border-collapse:collapse';

function stripSizeAttrs(attrs: string): string {
  return attrs
    .replace(/\s(?:width|height)\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(?:width|height)\s*=\s*[^\s>]+/gi, '');
}

function withFitStyle(attrs: string, extra: string): string {
  const cleaned = stripSizeAttrs(attrs);
  if (/style\s*=/i.test(cleaned)) {
    return cleaned.replace(/style\s*=\s*(['"])([\s\S]*?)\1/i, (_match, quote: string, style: string) => {
      const next = style
        .replace(/(?:^|;)\s*(?:width|height|max-width|min-width|max-height|min-height)\s*:[^;]*/gi, '')
        .replace(/^;+|;+$/g, '')
        .trim();
      const merged = [next, extra].filter(Boolean).join(';');
      return `style=${quote}${merged}${quote}`;
    });
  }
  return `${cleaned} style="${extra}"`;
}

function collapseMiniMediaPath(path: string): string {
  const doubled = /\/api\/v1\/mini\/media\/api\/v1\/mini\/media\//i;
  let next = path;
  while (doubled.test(next)) {
    next = next.replace(doubled, '/api/v1/mini/media/');
  }
  return next;
}

function rewriteEmbeddedMedia(html: string): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  return html.replace(
    /https?:\/\/[^/"'\s]+(\/api\/v1\/mini\/media\/[^"'\\\s)]+)/gi,
    (_match, path: string) => `${base}${collapseMiniMediaPath(path)}`,
  );
}

interface HtmlPart {
  id: string;
  kind: 'html';
  nodes: string;
}

interface CarouselPart {
  id: string;
  kind: 'carousel';
  slides: Array<{ url: string }>;
  autoplay: boolean;
  interval: number;
  loop: boolean;
}

type ContentPart = HtmlPart | CarouselPart;

function attrValue(tag: string, name: string): string {
  const match = new RegExp(`\\s${name}\\s*=\\s*(['"])([\\s\\S]*?)\\1`, 'i').exec(tag);
  return match ? match[2] : '';
}

function parseBool(raw: string): boolean | undefined {
  const value = raw.trim().toLowerCase();
  if (value === 'true' || value === '1' || value === 'yes') {
    return true;
  }
  if (value === 'false' || value === '0' || value === 'no') {
    return false;
  }
  return undefined;
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  urls.forEach((url) => {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    out.push(trimmed);
  });
  return out;
}

function configFromGalleryTag(openTag: string): {
  images: string[];
  autoplay?: boolean;
  interval?: number;
  loop?: boolean;
} | null {
  const raw = attrValue(openTag, 'data-aa-config');
  if (!raw) {
    return null;
  }
  try {
    const json = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const images = Array.isArray(json.images)
      ? json.images.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : [];
    const interval = [json.intervalMs, json.interval, json.scrollDuration].find(
      (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0,
    );
    return {
      images,
      autoplay: typeof json.autoplay === 'boolean' ? json.autoplay : undefined,
      interval,
      loop: typeof json.loop === 'boolean' ? json.loop : undefined,
    };
  } catch {
    return null;
  }
}

function imageUrlsInHtml(html: string): string[] {
  const urls: string[] = [];
  const pattern = /<img\b[^>]*\ssrc\s*=\s*(['"])([\s\S]*?)\1/gi;
  let match = pattern.exec(html);
  while (match) {
    urls.push(match[2]);
    match = pattern.exec(html);
  }
  return urls;
}

/** 动图图集包在 svg/foreignObject 里，rich-text 不会绘制。改成 swiper 可播放的帧。 */
function galleryPart(openTag: string, innerHtml: string, id: string): CarouselPart | null {
  const config = configFromGalleryTag(openTag);
  const fromImages = imageUrlsInHtml(innerHtml);
  const intervalAttr = Number(attrValue(openTag, 'data-interval'));
  const interval =
    Number.isFinite(intervalAttr) && intervalAttr > 0 ? intervalAttr : config?.interval;
  const loop = parseBool(attrValue(openTag, 'data-loop')) ?? config?.loop ?? true;
  const autoplay =
    parseBool(attrValue(openTag, 'data-autoplay')) ??
    config?.autoplay ??
    (loop || /data-aa-effect\s*=\s*(['"])scroll\1/i.test(openTag));
  const rawSlides = fromImages.length ? fromImages : (config?.images ?? slidesFromDataAttribute(openTag));
  const slides = (loop ? dedupeUrls(rawSlides) : rawSlides.map((url) => url.trim()).filter(Boolean)).map(
    (url) => ({ url: absolutizeMediaUrl(url) }),
  );
  if (!slides.length) {
    return null;
  }
  return {
    id,
    kind: 'carousel',
    slides,
    autoplay,
    interval: normalizeCarouselIntervalMs(interval),
    loop,
  };
}

function slidesFromDataAttribute(tag: string): string[] {
  const raw = attrValue(tag, 'data-slides').replace(/&quot;/g, '"');
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return String(record.url ?? record.src ?? '');
        }
        return '';
      })
      .filter((url) => url.trim() !== '');
  } catch {
    return [];
  }
}

function isGalleryOpenTag(tag: string): boolean {
  return (
    /\baa-svg-gallery\b|data-aa-svg-gallery\s*=|\b(?:kb-carousel|kb-media-carousel|wx-svg-carousel)\b/i.test(tag) ||
    /\bdata-kb-block\s*=\s*(['"])(?:carousel|svg-carousel|media-carousel)\1/i.test(tag)
  );
}

function findMatchingClose(html: string, from: number, tag: string): number {
  const pattern = new RegExp(`</?${tag}\\b[^>]*>`, 'gi');
  pattern.lastIndex = from;
  let depth = 1;
  let match = pattern.exec(html);
  while (match) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      return match.index + match[0].length;
    }
    match = pattern.exec(html);
  }
  return -1;
}

function expandToGalleryHost(html: string, sectionStart: number, sectionEnd: number): { start: number; end: number } {
  const lookbehind = html.slice(Math.max(0, sectionStart - 8000), sectionStart);
  const marker = lookbehind.lastIndexOf('aa-svg-gallery-editor-host');
  if (marker < 0) {
    return { start: sectionStart, end: sectionEnd };
  }
  const markerAt = Math.max(0, sectionStart - 8000) + marker;
  const hostStart = html.lastIndexOf('<div', markerAt);
  if (hostStart < 0 || hostStart > sectionStart) {
    return { start: sectionStart, end: sectionEnd };
  }
  const openEnd = html.indexOf('>', hostStart);
  if (openEnd < 0) {
    return { start: sectionStart, end: sectionEnd };
  }
  const divTag = /<\/?div\b[^>]*>/gi;
  divTag.lastIndex = openEnd + 1;
  let depth = 1;
  let match = divTag.exec(html);
  while (match) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      return { start: hostStart, end: match.index + match[0].length };
    }
    match = divTag.exec(html);
  }
  return { start: sectionStart, end: sectionEnd };
}

function hasVisibleHtml(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, '')
    .trim();
  return text.length > 0 || /<img\b/i.test(html);
}

function splitAnimatedGalleries(html: string): ContentPart[] {
  const openPattern = /<(section|div)\b[^>]*>/gi;
  const foundRanges: Array<{ start: number; end: number; openTag: string; inner: string }> = [];
  let found = openPattern.exec(html);
  while (found) {
    if (isGalleryOpenTag(found[0])) {
      const tag = found[1].toLowerCase();
      const end = findMatchingClose(html, found.index + found[0].length, tag);
      if (end > found.index) {
        foundRanges.push({
          start: found.index,
          end,
          openTag: found[0],
          inner: html.slice(found.index + found[0].length, end - `</${tag}>`.length),
        });
      }
    }
    found = openPattern.exec(html);
  }
  const matches = foundRanges.filter(
    (range) => !foundRanges.some((other) => other.start > range.start && other.end <= range.end),
  );
  if (!matches.length) {
    return [];
  }
  const parts: ContentPart[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const span = expandToGalleryHost(html, match.start, match.end);
    const start = Math.max(span.start, cursor);
    const before = html.slice(cursor, start);
    if (hasVisibleHtml(before)) {
      parts.push({ id: `html-${index}`, kind: 'html', nodes: fitHtmlToScreen(before) });
    }
    const carousel = galleryPart(match.openTag, match.inner, `carousel-${index}`);
    if (carousel) {
      parts.push(carousel);
    }
    cursor = Math.max(cursor, span.end);
  });
  const after = html.slice(cursor);
  if (hasVisibleHtml(after)) {
    parts.push({ id: 'html-end', kind: 'html', nodes: fitHtmlToScreen(after) });
  }
  return parts.filter((part) => part.kind === 'carousel' || part.nodes);
}

function fitHtmlToScreen(html: string): string {
  const trimmed = rewriteEmbeddedMedia((html || '').trim());
  if (!trimmed) {
    return '';
  }
  return trimmed
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
    .replace(/<img\b([^>]*?)(\/?)\s*>/gi, (_full, attrs: string, closing: string) => {
      const rewritten = attrs.replace(
        /(\ssrc\s*=\s*)(['"])(.*?)\2/i,
        (_match, prefix: string, quote: string, src: string) =>
          `${prefix}${quote}${absolutizeMediaUrl(src)}${quote}`,
      );
      return `<img${withFitStyle(rewritten, IMG_FIT_STYLE)} width="100%"${closing}>`;
    })
    .replace(/<table\b([^>]*?)>/gi, (_full, attrs: string) => {
      return `<table${withFitStyle(attrs, TABLE_FIT_STYLE)}>`;
    });
}

Component({
  properties: {
    html: {
      type: String,
      value: '',
    },
  },
  data: {
    parts: [] as ContentPart[],
  },
  observers: {
    html(value: string) {
      const source = value || '';
      const galleries = splitAnimatedGalleries(source);
      const parts = galleries.length
        ? galleries
        : hasVisibleHtml(source)
          ? [{ id: 'html-0', kind: 'html' as const, nodes: fitHtmlToScreen(source) }]
          : [];
      this.setData({ parts });
    },
  },
});
