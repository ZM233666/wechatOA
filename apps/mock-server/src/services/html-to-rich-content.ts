import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse, type HTMLElement, type Node as HtmlNode, NodeType } from 'node-html-parser';
import type { ArticleContentBlock, ImageResource, RichTextMark, RichTextSpan } from '@app/shared';
import { mockEnv } from '../config/env';

const ROOT = path.resolve(__dirname, '../../');
export const NEWS_MEDIA_DIR = path.join(ROOT, 'runtime/news/media');
export const NEWS_MEDIA_URL_PREFIX = '/mock-assets/news/runtime/';

let blockSeq = 0;
function nextBlockId(prefix: string): string {
  blockSeq += 1;
  return `${prefix}-${blockSeq}`;
}

function decodeDataUrl(dataUrl: string): { ext: string; buffer: Buffer } | null {
  const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/s.exec(dataUrl.trim());
  if (!match) {
    return null;
  }
  const rawExt = (match[1] ?? 'png').toLowerCase().replace('jpeg', 'jpg');
  const ext = rawExt === 'svg+xml' ? 'svg' : rawExt;
  try {
    return { ext, buffer: Buffer.from(match[2] ?? '', 'base64') };
  } catch {
    return null;
  }
}

function persistImageSrc(articleId: string, src: string, index: number): string {
  if (!src) {
    return '';
  }
  if (src.startsWith('/mock-assets/') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  const decoded = decodeDataUrl(src);
  if (!decoded) {
    // 相对 media 路径交给调用方拼 base
    return src;
  }
  const hash = createHash('sha1').update(decoded.buffer).digest('hex').slice(0, 12);
  const fileName = `img-${index}-${hash}.${decoded.ext}`;
  const dir = path.join(NEWS_MEDIA_DIR, articleId);
  fs.mkdirSync(dir, { recursive: true });
  const absolute = path.join(dir, fileName);
  if (!fs.existsSync(absolute)) {
    fs.writeFileSync(absolute, decoded.buffer);
  }
  return `${NEWS_MEDIA_URL_PREFIX}${articleId}/${fileName}`;
}

function collectMarks(el: HTMLElement): RichTextMark[] {
  const marks: RichTextMark[] = [];
  let current: HTMLElement | null = el;
  while (current && current.nodeType === NodeType.ELEMENT_NODE) {
    const tag = current.tagName?.toLowerCase();
    if (tag === 'strong' || tag === 'b') marks.push('bold');
    if (tag === 'em' || tag === 'i') marks.push('italic');
    if (tag === 'u') marks.push('underline');
    current = current.parentNode as HTMLElement | null;
  }
  return [...new Set(marks)];
}

function pushTextSpan(spans: RichTextSpan[], text: string, marks: RichTextMark[] = []): void {
  const cleaned = text.replace(/\s+/g, ' ');
  if (!cleaned) {
    return;
  }
  const last = spans[spans.length - 1];
  if (last && last.type === 'text' && JSON.stringify(last.marks ?? []) === JSON.stringify(marks)) {
    last.text += cleaned;
    return;
  }
  spans.push({ type: 'text', text: cleaned, marks });
}

function extractSpans(node: HtmlNode, spans: RichTextSpan[] = []): RichTextSpan[] {
  if (node.nodeType === NodeType.TEXT_NODE) {
    pushTextSpan(spans, node.text ?? '');
    return spans;
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) {
    return spans;
  }
  const el = node as HTMLElement;
  const tag = el.tagName?.toLowerCase() ?? '';
  if (tag === 'br') {
    pushTextSpan(spans, '\n');
    return spans;
  }
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? '';
    const text = el.text.trim();
    if (text) {
      if (href && !href.toLowerCase().startsWith('javascript:')) {
        spans.push({ type: 'link', text, href, marks: collectMarks(el) });
      } else {
        pushTextSpan(spans, text, collectMarks(el));
      }
    }
    return spans;
  }
  if (tag === 'img') {
    return spans;
  }
  el.childNodes.forEach((child) => extractSpans(child, spans));
  return spans;
}

function imageResource(url: string, alt = '文章配图'): ImageResource {
  return {
    url,
    alt,
    width: 1200,
    height: 675,
    aspectRatio: 1.7778,
  };
}

function headingLevel(tag: string): 1 | 2 | 3 {
  if (tag === 'h1') return 1;
  if (tag === 'h2') return 2;
  return 3;
}

export function htmlToRichContent(articleId: string, html: string): {
  blocks: ArticleContentBlock[];
  firstImageUrl?: string;
  plainText: string;
} {
  blockSeq = 0;
  const root = parse(`<div id="root">${html || ''}</div>`, {
    blockTextElements: { script: false, style: false, pre: true },
  });
  const container = root.querySelector('#root') ?? root;
  const blocks: ArticleContentBlock[] = [];
  let firstImageUrl: string | undefined;
  let imageIndex = 0;
  const plainParts: string[] = [];

  const appendParagraph = (el: HTMLElement) => {
    const spans = extractSpans(el).filter((span) => span.text.trim().length > 0);
    if (!spans.length) {
      return;
    }
    plainParts.push(spans.map((span) => span.text).join(''));
    blocks.push({
      id: nextBlockId('p'),
      type: 'paragraph',
      align: 'left',
      spans,
    });
  };

  const walk = (el: HTMLElement) => {
    const tag = el.tagName?.toLowerCase() ?? '';
    if (tag === 'script' || tag === 'style') {
      return;
    }
    if (/^h[1-3]$/.test(tag)) {
      const text = el.text.replace(/\s+/g, ' ').trim();
      if (text) {
        plainParts.push(text);
        blocks.push({
          id: nextBlockId('h'),
          type: 'heading',
          level: headingLevel(tag),
          text,
          align: 'left',
        });
      }
      return;
    }
    if (tag === 'p' || tag === 'div' || tag === 'section') {
      // 若块级下直接有图+文，拆开处理
      const childImgs = el.querySelectorAll('img');
      if (childImgs.length && el.childNodes.length) {
        el.childNodes.forEach((child) => {
          if (child.nodeType === NodeType.ELEMENT_NODE) {
            walk(child as HTMLElement);
          } else if (child.nodeType === NodeType.TEXT_NODE) {
            const text = (child.text ?? '').replace(/\s+/g, ' ').trim();
            if (text) {
              plainParts.push(text);
              blocks.push({
                id: nextBlockId('p'),
                type: 'paragraph',
                align: 'left',
                spans: [{ type: 'text', text, marks: [] }],
              });
            }
          }
        });
        return;
      }
      appendParagraph(el);
      return;
    }
    if (tag === 'img') {
      imageIndex += 1;
      if (imageIndex > mockEnv.NEWS_ARTICLE_MAX_IMAGES) {
        return;
      }
      const rawSrc = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') || '文章配图';
      const url = persistImageSrc(articleId, rawSrc, imageIndex);
      if (!url) {
        return;
      }
      if (!firstImageUrl) {
        firstImageUrl = url;
      }
      blocks.push({
        id: nextBlockId('img'),
        type: 'image',
        image: imageResource(url, alt),
        layout: 'wide',
      });
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = el
        .querySelectorAll('li')
        .map((li) => li.text.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (items.length) {
        plainParts.push(...items);
        blocks.push({
          id: nextBlockId('list'),
          type: 'list',
          ordered: tag === 'ol',
          items,
        });
      }
      return;
    }
    if (tag === 'blockquote') {
      const text = el.text.replace(/\s+/g, ' ').trim();
      if (text) {
        plainParts.push(text);
        blocks.push({
          id: nextBlockId('quote'),
          type: 'quote',
          text,
        });
      }
      return;
    }
    if (tag === 'hr') {
      blocks.push({ id: nextBlockId('hr'), type: 'divider' });
      return;
    }
    el.childNodes.forEach((child) => {
      if (child.nodeType === NodeType.ELEMENT_NODE) {
        walk(child as HTMLElement);
      }
    });
  };

  container.childNodes.forEach((child) => {
    if (child.nodeType === NodeType.ELEMENT_NODE) {
      walk(child as HTMLElement);
    } else if (child.nodeType === NodeType.TEXT_NODE) {
      const text = (child.text ?? '').replace(/\s+/g, ' ').trim();
      if (text) {
        plainParts.push(text);
        blocks.push({
          id: nextBlockId('p'),
          type: 'paragraph',
          align: 'left',
          spans: [{ type: 'text', text, marks: [] }],
        });
      }
    }
  });

  if (!blocks.length) {
    const fallback = container.text.replace(/\s+/g, ' ').trim() || '暂无正文';
    blocks.push({
      id: nextBlockId('p'),
      type: 'paragraph',
      align: 'left',
      spans: [{ type: 'text', text: fallback, marks: [] }],
    });
    plainParts.push(fallback);
  }

  return {
    blocks,
    firstImageUrl,
    plainText: plainParts.join(' ').replace(/\s+/g, ' ').trim(),
  };
}

export function absoluteMediaUrl(src: string, mediaBaseUrl: string): string {
  if (!src) {
    return '';
  }
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('/mock-assets/') ||
    src.startsWith('data:')
  ) {
    return src;
  }
  if (src.startsWith('/')) {
    return `${mediaBaseUrl.replace(/\/+$/, '')}${src}`;
  }
  return `${mediaBaseUrl.replace(/\/+$/, '')}/${src}`;
}
