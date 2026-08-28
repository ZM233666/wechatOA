import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(__dirname, '../../');
export const NEWS_MEDIA_DIR = path.join(ROOT, 'runtime/news/media');
export const NEWS_MEDIA_URL_PREFIX = '/mock-assets/news/runtime/';

export function decodeDataUrl(dataUrl: string): { ext: string; buffer: Buffer } | null {
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

export function persistArticleImageSrc(articleId: string, src: string, index: number): string {
  if (!src) {
    return '';
  }
  if (src.startsWith('/mock-assets/') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  const decoded = decodeDataUrl(src);
  if (!decoded) {
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
  const base = mediaBaseUrl.replace(/\/+$/, '');
  if (src.startsWith('/')) {
    return `${base}${src}`;
  }
  return `${base}/${src}`;
}
