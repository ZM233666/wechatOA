import { parse, type HTMLElement } from 'node-html-parser';
import { mockEnv } from '../config/env';
import { absoluteMediaUrl, persistArticleImageSrc } from './article-html-media';

const BLOCKED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea']);
const EVENT_ATTR_RE = /^on/i;
const IMG_RESPONSIVE_STYLE = 'max-width:100%;height:auto;display:block;border-radius:8px;margin:12px 0';
const TABLE_STYLE = 'width:100%;border-collapse:collapse;margin:12px 0;font-size:14px';
const TABLE_CELL_STYLE = 'border:1px solid #e5e7eb;padding:8px;vertical-align:top';

export type PrepareArticleHtmlOptions = {
  mediaBaseUrl?: string;
  maxImages?: number;
};

function isSafeHref(href: string): boolean {
  const value = href.trim().toLowerCase();
  if (!value || value.startsWith('javascript:') || value.startsWith('data:')) {
    return false;
  }
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/pages/') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:') ||
    value.startsWith('#') ||
    value.startsWith('/')
  );
}

function mergeStyle(existing: string | undefined, extra: string): string {
  const base = (existing ?? '').trim().replace(/;+\s*$/, '');
  if (!base) {
    return extra;
  }
  if (base.includes(extra.split(';')[0] ?? '')) {
    return base;
  }
  return `${base};${extra}`;
}

function sanitizeElement(el: HTMLElement): void {
  const tag = el.tagName?.toLowerCase() ?? '';
  if (BLOCKED_TAGS.has(tag)) {
    el.remove();
    return;
  }

  Object.keys(el.attributes).forEach((name) => {
    if (EVENT_ATTR_RE.test(name.toLowerCase())) {
      el.removeAttribute(name);
    }
  });

  if (tag === 'a') {
    const href = el.getAttribute('href') ?? '';
    if (href && !isSafeHref(href)) {
      el.removeAttribute('href');
    }
  }

  if (tag === 'img') {
    const alt = el.getAttribute('alt');
    if (!alt) {
      el.setAttribute('alt', '文章配图');
    }
    el.setAttribute('style', mergeStyle(el.getAttribute('style') ?? undefined, IMG_RESPONSIVE_STYLE));
  }

  if (tag === 'table') {
    el.setAttribute('style', mergeStyle(el.getAttribute('style') ?? undefined, TABLE_STYLE));
  }

  if (tag === 'td' || tag === 'th') {
    el.setAttribute('style', mergeStyle(el.getAttribute('style') ?? undefined, TABLE_CELL_STYLE));
  }

  if (tag === 'p') {
    const inner = el.innerHTML.trim().toLowerCase();
    if (inner === '<br>' || inner === '<br/>' || inner === '<br />') {
      el.setAttribute('style', mergeStyle(el.getAttribute('style') ?? undefined, 'min-height:1.5em'));
    }
  }

  [...el.childNodes].forEach((child) => {
    if (child.nodeType === 1) {
      sanitizeElement(child as HTMLElement);
    }
  });
}

function rewriteMediaUrls(
  el: HTMLElement,
  articleId: string,
  mediaBaseUrl: string,
  imageCounter: { value: number },
): void {
  const tag = el.tagName?.toLowerCase() ?? '';

  if (tag === 'img') {
    imageCounter.value += 1;
    if (imageCounter.value > (mockEnv.NEWS_ARTICLE_MAX_IMAGES ?? 40)) {
      el.remove();
      return;
    }
    const rawSrc = el.getAttribute('src') ?? '';
    let nextSrc = persistArticleImageSrc(articleId, rawSrc, imageCounter.value);
    if (nextSrc && !nextSrc.startsWith('http') && !nextSrc.startsWith('/mock-assets/')) {
      nextSrc = absoluteMediaUrl(nextSrc, mediaBaseUrl);
    }
    if (nextSrc) {
      el.setAttribute('src', nextSrc);
    } else {
      el.remove();
    }
  }

  if (tag === 'a') {
    const href = el.getAttribute('href') ?? '';
    if (href && !href.startsWith('http') && !href.startsWith('/pages/') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
      el.setAttribute('href', absoluteMediaUrl(href, mediaBaseUrl));
    }
  }

  [...el.childNodes].forEach((child) => {
    if (child.nodeType === 1) {
      rewriteMediaUrls(child as HTMLElement, articleId, mediaBaseUrl, imageCounter);
    }
  });
}

/**
 * 将 wangEditor / 管理端 content_html 转为可在小程序 rich-text 中展示的 HTML。
 * - 去除危险标签与事件属性
 * - base64 图片落地到 runtime/news/media
 * - 相对媒体路径转绝对 URL
 */
export function prepareArticleHtml(
  articleId: string,
  html: string,
  options: PrepareArticleHtmlOptions = {},
): string {
  const mediaBaseUrl = options.mediaBaseUrl ?? mockEnv.NEWS_ARTICLE_MEDIA_BASE_URL ?? mockEnv.NEWS_ARTICLE_API_BASE_URL;
  const trimmed = (html || '').trim();
  if (!trimmed) {
    return '<p>暂无正文</p>';
  }

  const root = parse(`<div id="article-root">${trimmed}</div>`, {
    blockTextElements: { script: false, style: false, pre: true },
  });
  const container = root.querySelector('#article-root');
  if (!container) {
    return '<p>暂无正文</p>';
  }

  rewriteMediaUrls(container, articleId, mediaBaseUrl, { value: 0 });
  sanitizeElement(container);

  const output = container.innerHTML.trim();
  return output || '<p>暂无正文</p>';
}

export function extractPlainTextFromHtml(html: string): string {
  const root = parse(`<div id="article-root">${html || ''}</div>`);
  const container = root.querySelector('#article-root');
  const text = (container?.text ?? '').replace(/\s+/g, ' ').trim();
  return text;
}

export function absolutizeHtmlAssetUrls(html: string, publicBaseUrl: string, mediaBaseUrl?: string): string {
  if (!html) {
    return html;
  }
  const base = publicBaseUrl.replace(/\/+$/, '');
  const mediaBase = (mediaBaseUrl ?? '').replace(/\/+$/, '');

  return html.replace(/\b(src|href)=(["'])([^"']+)\2/gi, (_match, attr: string, quote: string, url: string) => {
    if (url.startsWith('/mock-assets/')) {
      return `${attr}=${quote}${base}${url}${quote}`;
    }
    if (
      mediaBase &&
      !url.startsWith('http://') &&
      !url.startsWith('https://') &&
      !url.startsWith('/pages/') &&
      !url.startsWith('mailto:') &&
      !url.startsWith('tel:') &&
      !url.startsWith('#') &&
      (url.startsWith('/media/') || url.startsWith('media/'))
    ) {
      const normalized = url.startsWith('/') ? url : `/${url}`;
      return `${attr}=${quote}${mediaBase}${normalized}${quote}`;
    }
    return `${attr}=${quote}${url}${quote}`;
  });
}
