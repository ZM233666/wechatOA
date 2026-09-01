import type { ImageResource } from '@app/shared';
import { mockEnv } from '../config/env';
import type { NewsArticleFixture } from '../schemas/news.schema';
import type { ArticleContentRow } from './article-content.client';
import { extractPlainTextFromHtml, prepareArticleHtml } from './article-html.service';
import { absoluteMediaUrl } from './article-html-media';
import { htmlToRichContent } from './html-to-rich-content';

const DEFAULT_COVER: ImageResource = {
  url: '/mock-assets/news/news-001-cover.png',
  alt: '新闻封面',
  width: 1200,
  height: 675,
  aspectRatio: 1.7778,
};

function toIsoDateTime(value?: string | null): string {
  if (!value) {
    return new Date().toISOString();
  }
  // Django 常见：2026-08-24 09:57:21
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}+08:00`;
  const ms = Date.parse(withZone);
  if (Number.isNaN(ms)) {
    const fallback = Date.parse(value);
    return Number.isNaN(fallback) ? new Date().toISOString() : new Date(fallback).toISOString();
  }
  return new Date(ms).toISOString();
}

function slugify(input: string, id: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base ? `${base}-${id}` : `article-${id}`;
}

function normalizeTags(raw: unknown): Array<{ id: string; name: string }> {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item, index) => {
      if (typeof item === 'string' && item.trim()) {
        return { id: `tag-${index}-${item.trim()}`, name: item.trim() };
      }
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const name = String(record.name ?? record.label ?? '').trim();
        if (!name) {
          return null;
        }
        const id = String(record.id ?? name);
        return { id, name };
      }
      return null;
    })
    .filter((item): item is { id: string; name: string } => Boolean(item));
}

function summarize(text: string, title: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const source = cleaned || title;
  return source.slice(0, 220) || title.slice(0, 220) || '暂无摘要';
}

function resolveCover(options: {
  coverUrl?: string;
  title: string;
  mediaBaseUrl: string;
}): ImageResource {
  const raw = (options.coverUrl || '').trim();
  if (!raw) {
    return { ...DEFAULT_COVER, alt: options.title };
  }
  if (raw.startsWith('/mock-assets/')) {
    return {
      url: raw,
      alt: options.title,
      width: 1200,
      height: 675,
      aspectRatio: 1.7778,
    };
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    // 外链封面：仍放到 ImageResource；asset absolutizer 只处理 /mock-assets
    return {
      url: raw,
      alt: options.title,
      width: 1200,
      height: 675,
      aspectRatio: 1.7778,
    };
  }
  const abs = absoluteMediaUrl(raw, options.mediaBaseUrl);
  if (abs.startsWith('http://') || abs.startsWith('https://')) {
    return {
      url: abs,
      alt: options.title,
      width: 1200,
      height: 675,
      aspectRatio: 1.7778,
    };
  }
  return { ...DEFAULT_COVER, alt: options.title };
}

function categoryFromRow(row: ArticleContentRow): { id: string; name: string } {
  const name = (row.category || '').trim();
  if (!name) {
    return { id: 'general', name: '新闻' };
  }
  const id = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'general';
  return { id, name };
}

/**
 * 将 article-content 行映射为 mock NewsArticleFixture。
 * 草稿在 NEWS_ARTICLE_INCLUDE_DRAFTS 时可进列表/详情预览，但不进首页 Banner / latestNews。
 */
export function mapArticleRowToNewsFixture(row: ArticleContentRow): NewsArticleFixture {
  const id = String(row.id);
  const title = (row.title_zh || row.title_en || `文章 ${id}`).trim().slice(0, 160);
  const mediaBaseUrl = mockEnv.NEWS_ARTICLE_MEDIA_BASE_URL || mockEnv.NEWS_ARTICLE_API_BASE_URL;
  const rawHtml = row.content_html || '';
  const contentHtml = prepareArticleHtml(id, rawHtml, { mediaBaseUrl });
  const plainText = extractPlainTextFromHtml(rawHtml);
  const { blocks } = htmlToRichContent(id, rawHtml);
  const coverImage = resolveCover({
    coverUrl: row.cover_url,
    title,
    mediaBaseUrl,
  });
  const createdAt = toIsoDateTime(row.create_datetime);
  const updatedAt = toIsoDateTime(row.update_datetime || row.create_datetime);
  const rawStatus = (row.status || 'draft').toLowerCase();
  const isPublished = rawStatus === 'published';
  const publishedAt = isPublished
    ? toIsoDateTime(row.publish_time || row.update_datetime || row.create_datetime)
    : null;
  const explicitSummary = (row.summary || '').trim();
  const summary = explicitSummary || summarize(plainText, title);
  const category = categoryFromRow(row);
  const authorName = (row.author || 'KB China').trim() || 'KB China';
  const sourceName = (row.source || authorName).trim() || authorName;
  const shareImage = coverImage.url.startsWith('/mock-assets/')
    ? coverImage.url
    : DEFAULT_COVER.url;

  return {
    id: `article-${id}`,
    slug: slugify(title, id),
    status: isPublished ? 'published' : rawStatus === 'archived' ? 'archived' : 'draft',
    language: 'zh-CN',
    title,
    subtitle: (row.title_en || '').trim(),
    summary,
    category,
    author: {
      id: `author-${authorName}`,
      name: authorName,
      avatar: null,
    },
    source: {
      name: sourceName,
      url: null,
    },
    coverImage,
    thumbnailImage: coverImage,
    tags: normalizeTags(row.tags),
    placement: {
      showOnHome: isPublished && Boolean(row.is_home_recommended),
      showOnBanner: isPublished && Boolean(row.is_home_recommended),
      featured: Boolean(row.is_home_recommended),
      pinned: Boolean(row.is_top),
      sortOrder: Number(row.views ?? 0),
    },
    createdAt,
    updatedAt,
    publishedAt,
    scheduledAt: null,
    contentHtml,
    bodyFormat: 'html',
    richContent: blocks,
    relatedArticleIds: [],
    explicitSummary: explicitSummary || undefined,
    share: {
      title,
      summary,
      imageUrl: shareImage,
    },
  };
}
