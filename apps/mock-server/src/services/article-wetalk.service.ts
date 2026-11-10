import type { ImageResource } from '@app/shared';
import { mockEnv } from '../config/env';
import { logInfo, logWarn } from '../utils/logger';
import {
  ARTICLE_NEWS_SYNC_TTL_MS,
  fetchArticleContentDetail,
  fetchWetalkArticlesFromBackend,
  isArticleNewsEnabled,
  type ArticleContentRow,
} from './article-content.client';
import { mapArticleRowToNewsFixture } from './article-news.mapper';
import { hydrateArticleMedia } from './article-media-mirror.service';
import type { NewsArticleFixture } from '../schemas/news.schema';
import { listWetalkPdfFileNames, resolveWetalkPdfAbsolute } from './minio-pdf.service';

export type WetalkContentKind = 'article' | 'pdf';

export type WetalkNewsSummary = {
  id: string;
  title: string;
  date: string;
  coverImage: ImageResource;
  kind: WetalkContentKind;
  volumeNo?: string;
  pdfUrl?: string;
};

export type WetalkNewsDetail = {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  kind: WetalkContentKind;
  contentHtml: string;
  coverImage?: ImageResource;
  richContent: NewsArticleFixture['richContent'];
  bodyFormat: 'html' | 'blocks';
  pdfUrl?: string;
};

type SyncedWetalkItem = {
  row: ArticleContentRow;
  fixture: NewsArticleFixture;
  kind: WetalkContentKind;
};

type SyncState = {
  lastAttemptMs: number;
  lastSuccessMs: number;
  lastError?: string;
  inFlight: Promise<SyncedWetalkItem[]> | null;
  items: SyncedWetalkItem[];
};

const state: SyncState = {
  lastAttemptMs: 0,
  lastSuccessMs: 0,
  inFlight: null,
  items: [],
};

const detailCache = new Map<string, SyncedWetalkItem>();
const detailRequests = new Map<string, Promise<SyncedWetalkItem>>();

const DEFAULT_PDF_COVER: ImageResource = {
  url: '/mock-assets/kb-life/care.png',
  alt: 'WeTalk PDF',
  width: 800,
  height: 400,
  aspectRatio: 2,
};

function formatDisplayDate(isoOrCms: string | null | undefined): string {
  if (!isoOrCms) {
    return '';
  }
  const ms = Date.parse(
    isoOrCms.includes('T') || isoOrCms.includes('Z') ? isoOrCms : isoOrCms.replace(' ', 'T'),
  );
  if (Number.isNaN(ms)) {
    const match = String(isoOrCms).match(/(20\d{2}|19\d{2})[^\d]?(\d{1,2})[^\d]?(\d{1,2})/);
    if (!match) {
      return String(isoOrCms);
    }
    return `${match[1]} / ${match[2].padStart(2, '0')} / ${match[3].padStart(2, '0')}`;
  }
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y} / ${m} / ${day}`;
}

function backendId(fixtureId: string): string {
  return fixtureId.replace(/^article-/, '');
}

export function resolveWetalkContentKind(row: ArticleContentRow): WetalkContentKind {
  if (row.pdf_file != null && String(row.pdf_file).trim() !== '') {
    return 'pdf';
  }
  if ((row.pdf_url || '').trim()) {
    return 'pdf';
  }
  if ((row.pdf_file_name || '').trim()) {
    return 'pdf';
  }
  return 'article';
}

function findLocalWetalkPdfFileName(pdfFileName?: string | null): string | null {
  const target = (pdfFileName || '').trim();
  if (!target) {
    return null;
  }
  const files = listWetalkPdfFileNames().map((item) => item.fileName);
  if (files.includes(target)) {
    return target;
  }
  const targetBase = target.replace(/\.pdf$/i, '').toLowerCase();
  const hit = files.find((name) => {
    const base = name.replace(/\.pdf$/i, '').toLowerCase();
    return base.endsWith(targetBase) || base.includes(targetBase) || targetBase.includes(base);
  });
  return hit || null;
}

function findLocalWetalkIssue(pdfFileName?: string | null) {
  const localName = findLocalWetalkPdfFileName(pdfFileName);
  if (!localName) {
    return null;
  }
  // 延迟加载，避免与 fixture.service 形成循环依赖
  const { getFixtures } = require('./fixture.service') as typeof import('./fixture.service');
  const { pdfFileNameToId } = require('./pdf-catalog.service') as typeof import('./pdf-catalog.service');
  const expectedId = pdfFileNameToId(localName);
  const issues = getFixtures().wetalkIssues || [];
  return (
    issues.find((item) => item.id === expectedId) ||
    issues.find((item) => {
      const pdfUrl = decodeURIComponent(item.pdfUrl || '');
      return pdfUrl.endsWith(`/${localName}`) || pdfUrl.includes(localName);
    }) ||
    null
  );
}

function coverFromLocalWetalkPdf(pdfFileName?: string | null): ImageResource | null {
  const issue = findLocalWetalkIssue(pdfFileName);
  return issue?.coverImage || issue?.pages?.[0]?.coverImage || null;
}

async function enrichArticleRowForMedia(row: ArticleContentRow): Promise<ArticleContentRow> {
  const kind = resolveWetalkContentKind(row);
  const needsDetail =
    !row.cover_url?.trim() ||
    (kind === 'pdf' && !(row.pdf_url || '').trim()) ||
    row.cover != null ||
    (Array.isArray(row.attachments) && row.attachments.length > 0);
  if (!needsDetail && row.cover_url?.trim()) {
    return row;
  }
  if (!needsDetail) {
    return row;
  }
  try {
    const detail = await fetchArticleContentDetail(row.id);
    return {
      ...row,
      cover_url: detail.cover_url || row.cover_url,
      cover: detail.cover ?? row.cover,
      attachments: detail.attachments ?? row.attachments,
      content_html: row.content_html ?? detail.content_html,
      volume_no: row.volume_no ?? detail.volume_no,
      author: row.author ?? detail.author,
      publish_time: row.publish_time ?? detail.publish_time,
      pdf_file: row.pdf_file ?? detail.pdf_file,
      pdf_url: row.pdf_url || detail.pdf_url,
      pdf_file_name: row.pdf_file_name || detail.pdf_file_name,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn('WeTalk list row enrich failed', { id: row.id, message });
    return row;
  }
}

function toSyncedItem(row: ArticleContentRow, fixture: NewsArticleFixture): SyncedWetalkItem {
  const kind = resolveWetalkContentKind(row);
  let nextFixture = fixture;
  if (kind === 'pdf') {
    const pdfCover = coverFromLocalWetalkPdf(row.pdf_file_name);
    if (pdfCover && (!fixture.coverImage?.url || fixture.coverImage.url.includes('news-001-cover'))) {
      nextFixture = {
        ...fixture,
        coverImage: pdfCover,
        thumbnailImage: pdfCover,
      };
    } else if (!fixture.coverImage?.url) {
      nextFixture = {
        ...fixture,
        coverImage: { ...DEFAULT_PDF_COVER, alt: fixture.title },
        thumbnailImage: { ...DEFAULT_PDF_COVER, alt: fixture.title },
      };
    }
  }
  return { row, fixture: nextFixture, kind };
}

export async function syncArticleWetalk(options?: {
  force?: boolean;
  ttlMs?: number;
}): Promise<SyncedWetalkItem[]> {
  if (!isArticleNewsEnabled()) {
    return [];
  }
  const ttlMs = options?.ttlMs ?? ARTICLE_NEWS_SYNC_TTL_MS;
  const now = Date.now();
  if (!options?.force && state.inFlight) {
    return state.inFlight;
  }
  if (!options?.force && now - state.lastSuccessMs < ttlMs && state.items.length) {
    return state.items;
  }

  const run = (async () => {
    state.lastAttemptMs = Date.now();
    try {
      const rows = await fetchWetalkArticlesFromBackend();
      const enrichedRows = await Promise.all(rows.map((row) => enrichArticleRowForMedia(row)));
      const items = await Promise.all(
        enrichedRows.map(async (row) => {
          const fixture = await hydrateArticleMedia(row, mapArticleRowToNewsFixture(row));
          return toSyncedItem(row, fixture);
        }),
      );
      items.sort((a, b) => {
        const ta = a.fixture.publishedAt ? Date.parse(a.fixture.publishedAt) : 0;
        const tb = b.fixture.publishedAt ? Date.parse(b.fixture.publishedAt) : 0;
        return tb - ta;
      });
      state.items = items;
      state.lastSuccessMs = Date.now();
      state.lastError = undefined;
      logInfo('Synced WeTalk news from article-content', {
        count: items.length,
        pdfCount: items.filter((item) => item.kind === 'pdf').length,
        articleCount: items.filter((item) => item.kind === 'article').length,
        includeDrafts: mockEnv.NEWS_ARTICLE_INCLUDE_DRAFTS,
      });
      return items;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      state.lastError = message;
      logWarn('WeTalk news sync failed; keeping previous cache', { message });
      return state.items;
    } finally {
      state.inFlight = null;
    }
  })();

  state.inFlight = run;
  return run;
}

export function getArticleWetalkStatus(): { count: number; lastError?: string } {
  return { count: state.items.length, lastError: state.lastError };
}

export async function loadWetalkNewsSummaries(options?: {
  force?: boolean;
}): Promise<WetalkNewsSummary[]> {
  const items = await syncArticleWetalk(options);
  return items.map((item) => {
    const rawId = backendId(item.fixture.id);
    return {
      id: rawId,
      title: item.fixture.title,
      date: formatDisplayDate(
        item.fixture.publishedAt || item.fixture.updatedAt || item.fixture.createdAt,
      ),
      coverImage: item.fixture.coverImage || item.fixture.thumbnailImage,
      kind: item.kind,
      volumeNo: item.row.volume_no || undefined,
      ...(item.kind === 'pdf' && (item.row.pdf_url || '').trim()
        ? { pdfUrl: String(item.row.pdf_url).trim() }
        : {}),
    };
  });
}

async function loadSyncedItem(
  id: string,
  options?: { force?: boolean },
): Promise<SyncedWetalkItem | null> {
  const normalized = String(id || '').trim();
  if (!normalized) {
    return null;
  }
  await syncArticleWetalk(options);
  const fixtureId = normalized.startsWith('article-') ? normalized : `article-${normalized}`;
  const cached = detailCache.get(fixtureId);
  if (cached && !options?.force) {
    return cached;
  }

  let pending = detailRequests.get(fixtureId);
  if (!pending) {
    pending = (async () => {
      try {
        const row = await fetchArticleContentDetail(backendId(fixtureId));
        if ((row.content_type || '').toLowerCase() !== 'wetalk') {
          throw new Error(`Not a wetalk article: ${row.content_type}`);
        }
        if (!mockEnv.NEWS_ARTICLE_INCLUDE_DRAFTS && (row.status || '').toLowerCase() !== 'published') {
          throw new Error(`WeTalk article not published: ${row.status}`);
        }
        const mapped = await hydrateArticleMedia(row, mapArticleRowToNewsFixture(row));
        const synced = toSyncedItem(row, mapped);
        detailCache.set(fixtureId, synced);
        return synced;
      } finally {
        detailRequests.delete(fixtureId);
      }
    })();
    detailRequests.set(fixtureId, pending);
  }

  try {
    return await pending;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn('WeTalk news detail load failed', { id: normalized, message });
    return (
      state.items.find(
        (item) => item.fixture.id === fixtureId || backendId(item.fixture.id) === normalized,
      ) || null
    );
  }
}

export async function loadWetalkNewsDetail(
  id: string,
  options?: { force?: boolean },
): Promise<WetalkNewsDetail | null> {
  const synced = await loadSyncedItem(id, options);
  if (!synced || synced.kind === 'pdf') {
    // PDF 走 loadWetalkCmsPdfIssue / insight-reader，不走图文详情
    return null;
  }
  return mapFixtureToDetail(synced);
}

/**
 * 将 CMS PDF 文稿映射为可复用 insight-reader 的 WeTalk 期次结构。
 * 优先匹配 MinIO/本地同名 PDF 已渲页结果。
 */
export async function loadWetalkCmsPdfIssue(
  id: string,
  options?: { force?: boolean },
): Promise<Record<string, unknown> | null> {
  const synced = await loadSyncedItem(id, options);
  if (!synced || synced.kind !== 'pdf') {
    return null;
  }
  const pdfFileName = (synced.row.pdf_file_name || '').trim();
  const localName = findLocalWetalkPdfFileName(pdfFileName);
  const matchedIssue = findLocalWetalkIssue(pdfFileName);

  if (matchedIssue?.pages?.length) {
    return {
      ...matchedIssue,
      id: backendId(synced.fixture.id),
      title: synced.fixture.title,
      date: formatDisplayDate(
        synced.fixture.publishedAt || synced.fixture.updatedAt || synced.fixture.createdAt,
      ),
      kind: 'pdf',
    };
  }

  // 本地有 PDF 但尚未进 fixture：按期次渲页后再读
  if (localName) {
    try {
      const { refreshWetalkIssueFromDisk } = require('./fixture.service') as typeof import('./fixture.service');
      const { pdfFileNameToId } = require('./pdf-catalog.service') as typeof import('./pdf-catalog.service');
      const refreshed = refreshWetalkIssueFromDisk(pdfFileNameToId(localName));
      if (refreshed?.pages?.length) {
        return {
          ...refreshed,
          id: backendId(synced.fixture.id),
          title: synced.fixture.title,
          date: formatDisplayDate(
            synced.fixture.publishedAt || synced.fixture.updatedAt || synced.fixture.createdAt,
          ),
          kind: 'pdf',
        };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('WeTalk CMS PDF sheet refresh failed', { id, localName, message });
    }
  }

  const absolute = localName ? resolveWetalkPdfAbsolute(localName) : null;
  const pdfUrl =
    (synced.row.pdf_url || '').trim() ||
    (localName ? `/mock-assets/kb-life/wetalk/files/${encodeURIComponent(localName)}` : '');

  return {
    id: backendId(synced.fixture.id),
    title: synced.fixture.title,
    date: formatDisplayDate(
      synced.fixture.publishedAt || synced.fixture.updatedAt || synced.fixture.createdAt,
    ),
    coverImage: synced.fixture.coverImage || matchedIssue?.coverImage || DEFAULT_PDF_COVER,
    pdfUrl,
    kind: 'pdf',
    pages: [
      {
        id: `${backendId(synced.fixture.id)}-cover`,
        type: 'cover' as const,
        title: synced.fixture.title,
        coverImage: synced.fixture.coverImage || matchedIssue?.coverImage || DEFAULT_PDF_COVER,
      },
    ],
    ...(absolute ? { localPdf: absolute } : {}),
  };
}

function mapFixtureToDetail(item: SyncedWetalkItem): WetalkNewsDetail {
  const article = item.fixture;
  const rawCategory = (article.category?.name || '').trim();
  const category =
    !rawCategory || rawCategory === '新闻' || article.category?.id === 'general'
      ? 'WeTalk'
      : rawCategory;
  return {
    id: backendId(article.id),
    title: article.title,
    category,
    date: formatDisplayDate(article.publishedAt || article.updatedAt || article.createdAt),
    author: article.author?.name || '',
    kind: item.kind,
    contentHtml: article.contentHtml || '',
    coverImage: article.coverImage,
    richContent: article.richContent || [],
    bodyFormat: article.bodyFormat === 'blocks' ? 'blocks' : 'html',
    ...(item.kind === 'pdf' && (item.row.pdf_url || '').trim()
      ? { pdfUrl: String(item.row.pdf_url).trim() }
      : {}),
  };
}
