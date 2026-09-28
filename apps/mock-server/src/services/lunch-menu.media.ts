import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { mockEnv } from '../config/env';
import { logWarn } from '../utils/logger';

const ROOT = path.resolve(__dirname, '../../');
export const LUNCH_MENU_MEDIA_DIR = path.join(ROOT, 'runtime/lunch-menu');
export const LUNCH_MENU_MEDIA_URL_PREFIX = '/mock-assets/kb-life/lunch-menu/';

const warming = new Set<string>();

export function lunchMenuObjectKey(storedUrl: string): string {
  const raw = storedUrl.split('?')[0]?.trim() ?? '';
  if (!raw) {
    return '';
  }
  if (!/^https?:\/\//i.test(raw)) {
    return decodeURIComponent(raw.replace(/^\/+/, ''));
  }
  let pathname = '';
  try {
    pathname = decodeURIComponent(new URL(raw).pathname.replace(/^\/+/, ''));
  } catch {
    return '';
  }
  const bucket = mockEnv.MINIO_BUCKET.replace(/^\/+|\/+$/g, '');
  if (bucket && pathname.startsWith(`${bucket}/`)) {
    return pathname.slice(bucket.length + 1);
  }
  return pathname;
}

function safeExt(objectKey: string): string {
  const ext = path.extname(objectKey.split('?')[0] ?? '').toLowerCase();
  return /^\.(png|jpe?g|gif|webp|bmp)$/.test(ext) ? ext : '.jpg';
}

function localFileFor(url: string): { absolute: string; relative: string } {
  const objectKey = lunchMenuObjectKey(url);
  const cacheKey = objectKey || url.split('?')[0] || url;
  const fileName = `${createHash('sha1').update(cacheKey).digest('hex').slice(0, 20)}${safeExt(objectKey || url)}`;
  return {
    absolute: path.join(LUNCH_MENU_MEDIA_DIR, fileName),
    relative: `${LUNCH_MENU_MEDIA_URL_PREFIX}${fileName}`,
  };
}

async function readHttpImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) {
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length > 32 ? buffer : null;
  } catch {
    return null;
  }
}

function scheduleBackgroundMirror(url: string, absolute: string): void {
  if (warming.has(absolute) || fs.existsSync(absolute)) {
    return;
  }
  warming.add(absolute);
  void (async () => {
    try {
      const buffer = await readHttpImage(url);
      if (!buffer) {
        return;
      }
      fs.mkdirSync(LUNCH_MENU_MEDIA_DIR, { recursive: true });
      fs.writeFileSync(absolute, buffer);
    } catch {
      logWarn('Unable to mirror lunch menu image', { url: url.slice(0, 180) });
    } finally {
      warming.delete(absolute);
    }
  })();
}

/** 请求路径只用本地缓存或原始 URL，避免远程 MinIO 超时拖死食堂页 */
export function resolveLunchMenuImage(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('/mock-assets/')) {
    return trimmed;
  }
  const { absolute, relative } = localFileFor(trimmed);
  if (fs.existsSync(absolute)) {
    return relative;
  }
  scheduleBackgroundMirror(trimmed, absolute);
  return trimmed;
}

export async function mirrorLunchMenuImage(url: string): Promise<string> {
  return resolveLunchMenuImage(url);
}
