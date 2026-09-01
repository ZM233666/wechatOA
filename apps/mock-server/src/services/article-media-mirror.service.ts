import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Client as MinioClient } from 'minio';
import type { ImageResource } from '@app/shared';
import { mockEnv } from '../config/env';
import type { ArticleContentRow } from './article-content.client';
import { loginArticleApi } from './article-content.client';
import type { NewsArticleFixture } from '../schemas/news.schema';
import {
  absoluteMediaUrl,
  NEWS_MEDIA_DIR,
  NEWS_MEDIA_URL_PREFIX,
} from './article-html-media';
import { isMinioPdfEnabled } from './minio-pdf.service';
import { logInfo, logWarn } from '../utils/logger';

const DEFAULT_COVER: ImageResource = {
  url: '/mock-assets/news/news-001-cover.png',
  alt: '新闻封面',
  width: 1200,
  height: 675,
  aspectRatio: 1.7778,
};

function localMirrorPath(
  articleId: string,
  fileName: string,
): { relative: string; absolute: string } {
  return {
    relative: `${NEWS_MEDIA_URL_PREFIX}${articleId}/${fileName}`,
    absolute: path.join(NEWS_MEDIA_DIR, articleId, fileName),
  };
}

function fileNameForSrc(src: string, kind: string, index: number): string {
  const hash = createHash('sha1').update(src).digest('hex').slice(0, 16);
  let ext = '.png';
  try {
    const pathname = src.startsWith('http://') || src.startsWith('https://')
      ? new URL(src).pathname
      : src;
    ext = path.extname(pathname) || '.png';
  } catch {
    ext = '.png';
  }
  return `${kind}-${index}-${hash}${ext}`;
}

function minioObjectKeys(mediaPath: string): string[] {
  const trimmed = mediaPath.trim().replace(/^\/+/, '');
  const keys = new Set<string>();
  if (trimmed) {
    keys.add(trimmed);
  }
  if (trimmed.startsWith('media/')) {
    keys.add(trimmed.slice('media/'.length));
  }
  return [...keys];
}

function createMinioClient(): MinioClient {
  return new MinioClient({
    endPoint: mockEnv.MINIO_ENDPOINT,
    port: mockEnv.MINIO_PORT,
    useSSL: mockEnv.MINIO_USE_SSL,
    accessKey: mockEnv.MINIO_ACCESS_KEY,
    secretKey: mockEnv.MINIO_SECRET_KEY,
  });
}

async function fetchBuffer(url: string, authToken?: string): Promise<Buffer | null> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `JWT ${authToken}`;
  }
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return isLikelyImageBuffer(buffer) ? buffer : null;
  } catch {
    return null;
  }
}

async function fetchFromMinio(mediaPath: string): Promise<Buffer | null> {
  if (!isMinioPdfEnabled()) {
    return null;
  }
  const client = createMinioClient();
  for (const objectKey of minioObjectKeys(mediaPath)) {
    try {
      const stream = await client.getObject(mockEnv.MINIO_BUCKET, objectKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      if (isLikelyImageBuffer(buffer)) {
        return buffer;
      }
    } catch {
      // try next key shape
    }
  }
  return null;
}

function isLikelyImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 32) {
    return false;
  }
  if (buffer[0] === 0x7b || buffer[0] === 0x5b) {
    return false;
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    return true;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return true;
  }
  if (buffer.slice(0, 4).toString() === 'GIF8') {
    return true;
  }
  if (buffer.slice(0, 2).toString() === 'BM') {
    return true;
  }
  return buffer.length > 1024;
}

async function fetchByFileId(fileId: number | string, authToken?: string): Promise<Buffer | null> {
  const apiBase = mockEnv.NEWS_ARTICLE_API_BASE_URL.replace(/\/+$/, '');
  const url = `${apiBase}/api/system/file/${fileId}/`;
  const response = await fetch(url, {
    headers: authToken ? { Authorization: `JWT ${authToken}` } : {},
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    return null;
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as {
        data?: { file_url?: string; url?: string };
      };
      const fileUrl = payload.data?.file_url ?? payload.data?.url;
      if (typeof fileUrl === 'string' && fileUrl.trim()) {
        const normalized = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
        return loadRemoteMediaBuffer(normalized, {
          mediaBaseUrl: apiBase,
          authToken,
        });
      }
    } catch {
      return null;
    }
    return null;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return isLikelyImageBuffer(buffer) ? buffer : null;
}

async function loadRemoteMediaBuffer(
  src: string,
  options: { mediaBaseUrl: string; authToken?: string; fileId?: number | null },
): Promise<Buffer | null> {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:')) {
    return null;
  }

  const absolute =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : absoluteMediaUrl(trimmed, options.mediaBaseUrl);

  return (
    (await fetchBuffer(absolute, options.authToken)) ??
    (await fetchFromMinio(trimmed)) ??
    (options.fileId != null ? await fetchByFileId(options.fileId, options.authToken) : null)
  );
}

export async function mirrorRemoteMediaUrl(
  articleId: string,
  src: string,
  options: {
    mediaBaseUrl: string;
    authToken?: string;
    kind?: string;
    index?: number;
    fileId?: number | null;
  },
): Promise<string> {
  const trimmed = (src || '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('/mock-assets/')) {
    return trimmed;
  }

  const absolute =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : absoluteMediaUrl(trimmed, options.mediaBaseUrl);

  const fileName = fileNameForSrc(absolute, options.kind ?? 'media', options.index ?? 0);
  const { relative, absolute: localAbs } = localMirrorPath(articleId, fileName);
  if (fs.existsSync(localAbs)) {
    const cached = fs.readFileSync(localAbs);
    if (isLikelyImageBuffer(cached)) {
      return relative;
    }
    fs.unlinkSync(localAbs);
  }

  const buffer = await loadRemoteMediaBuffer(trimmed, {
    mediaBaseUrl: options.mediaBaseUrl,
    authToken: options.authToken,
    fileId: options.fileId,
  });
  if (!buffer?.length) {
    logWarn('Unable to mirror article media', { articleId, src: trimmed });
    return '';
  }

  fs.mkdirSync(path.dirname(localAbs), { recursive: true });
  fs.writeFileSync(localAbs, buffer);
  logInfo('Mirrored article media', { articleId, src: trimmed, local: relative });
  return relative;
}

function isRemoteMediaUrl(url: string, mediaBaseUrl: string): boolean {
  if (!url || url.startsWith('/mock-assets/') || url.startsWith('data:')) {
    return false;
  }
  if (url.startsWith('/media/') || url.startsWith('media/')) {
    return true;
  }
  const base = mediaBaseUrl.replace(/\/+$/, '');
  return url.startsWith(`${base}/media/`);
}

export function coverMirrorCandidates(row: ArticleContentRow): Array<{ url: string; fileId?: number | null }> {
  const seen = new Set<string>();
  const candidates: Array<{ url: string; fileId?: number | null; priority: number }> = [];

  const push = (url: string | undefined | null, fileId: number | null | undefined, priority: number) => {
    const trimmed = (url || '').trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    candidates.push({ url: trimmed, fileId: fileId ?? null, priority });
  };

  push(row.cover_url, row.cover ?? null, 0);

  for (const attachment of row.attachments ?? []) {
    const type = (attachment.attachment_type || '').toLowerCase();
    const priority = type.includes('cover')
      ? 1
      : attachment.file != null && attachment.file === row.cover
        ? 1
        : 5;
    push(attachment.url, attachment.file ?? null, priority);
  }

  return candidates
    .sort((a, b) => a.priority - b.priority)
    .map(({ url, fileId }) => ({ url, fileId }));
}

export async function hydrateArticleMedia(
  row: ArticleContentRow,
  fixture: NewsArticleFixture,
): Promise<NewsArticleFixture> {
  const authToken = await loginArticleApi().catch(() => undefined);
  const mediaBaseUrl = mockEnv.NEWS_ARTICLE_MEDIA_BASE_URL || mockEnv.NEWS_ARTICLE_API_BASE_URL;
  const articleId = String(row.id);

  const mirror = (src: string, kind: string, index = 0, fileId?: number | null) =>
    mirrorRemoteMediaUrl(articleId, src, {
      mediaBaseUrl,
      authToken,
      kind,
      index,
      fileId,
    });

  const richContent = await Promise.all(
    fixture.richContent.map(async (block, index) => {
      if (block.type !== 'image') {
        return block;
      }
      const src = block.image.url;
      if (!isRemoteMediaUrl(src, mediaBaseUrl)) {
        return block;
      }
      const mirrored = await mirror(src, 'inline', index);
      if (!mirrored.startsWith('/mock-assets/')) {
        return block;
      }
      return {
        ...block,
        image: {
          ...block.image,
          url: mirrored,
        },
      };
    }),
  );

  let contentHtml = fixture.contentHtml ?? '';
  if (contentHtml) {
    const replacements = new Map<string, string>();
    for (const match of contentHtml.matchAll(/src="([^"]+)"/g)) {
      const src = match[1] ?? '';
      if (!isRemoteMediaUrl(src, mediaBaseUrl) || replacements.has(src)) {
        continue;
      }
      const mirrored = await mirror(src, 'inline-html', replacements.size);
      if (mirrored.startsWith('/mock-assets/')) {
        replacements.set(src, mirrored);
      }
    }
    for (const [from, to] of replacements) {
      contentHtml = contentHtml.split(from).join(to);
    }
  }

  const coverCandidates = coverMirrorCandidates(row);
  let coverUrl = '';
  for (const [index, candidate] of coverCandidates.entries()) {
    const mirrored = await mirror(candidate.url, 'cover', index, candidate.fileId ?? null);
    if (mirrored.startsWith('/mock-assets/')) {
      coverUrl = mirrored;
      break;
    }
  }
  if (!coverUrl.startsWith('/mock-assets/')) {
    coverUrl = DEFAULT_COVER.url;
    if (row.cover_url?.trim()) {
      logWarn('Cover unavailable; using placeholder instead of inline content image', {
        articleId,
        coverUrl: row.cover_url,
        coverFileId: row.cover ?? null,
        triedAttachments: row.attachments?.length ?? 0,
      });
    }
  }

  const coverImage: ImageResource = {
    ...fixture.coverImage,
    url: coverUrl,
    alt: fixture.coverImage.alt || fixture.title,
  };

  return {
    ...fixture,
    coverImage,
    thumbnailImage: coverImage,
    richContent,
    contentHtml: contentHtml || fixture.contentHtml,
    share: {
      ...fixture.share,
      imageUrl: coverUrl.startsWith('/mock-assets/') ? coverUrl : fixture.share.imageUrl,
    },
  };
}
