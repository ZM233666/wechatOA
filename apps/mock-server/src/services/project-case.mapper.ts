import type { ArticleContentBlock, ImageResource } from '@app/shared';
import type { z } from 'zod';
import type { caseDetailSchema, caseSummarySchema } from '../schemas/case.schema';
import { absoluteMediaUrl } from './article-html-media';
import { htmlToRichContent } from './html-to-rich-content';
import type { ProjectCaseRow } from './project-case.client';

type CaseSummary = z.infer<typeof caseSummarySchema>;
type CaseDetail = z.infer<typeof caseDetailSchema>;

const DEFAULT_COVER: ImageResource = {
  url: '/mock-assets/cases/case-001-cover.png',
  alt: '项目案例封面',
  width: 1200,
  height: 800,
  aspectRatio: 1.5,
};

function toIsoDateTime(value?: string | null): string {
  if (!value) {
    return new Date().toISOString();
  }
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}+08:00`;
  const ms = Date.parse(withZone);
  if (Number.isNaN(ms)) {
    const fallback = Date.parse(value);
    return Number.isNaN(fallback) ? new Date().toISOString() : new Date(fallback).toISOString();
  }
  return new Date(ms).toISOString();
}

function slugifyCategory(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'general'
  );
}

function categoryFromRow(row: ProjectCaseRow): { id: string; name: string } {
  const name = (row.category || '').trim();
  if (!name) {
    return { id: 'general', name: '项目案例' };
  }
  return { id: slugifyCategory(name), name };
}

function resolveTitle(row: ProjectCaseRow): string {
  const id = String(row.id);
  return (row.title_zh || row.title_en || `案例 ${id}`).trim().slice(0, 160);
}

function resolveSummary(row: ProjectCaseRow, title: string): string {
  const explicit = (row.summary || '').trim();
  if (explicit) {
    return explicit.slice(0, 220);
  }
  return title.slice(0, 220) || '暂无摘要';
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
      height: 800,
      aspectRatio: 1.5,
    };
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return {
      url: raw,
      alt: options.title,
      width: 1200,
      height: 800,
      aspectRatio: 1.5,
    };
  }
  const abs = absoluteMediaUrl(raw, options.mediaBaseUrl);
  if (abs.startsWith('http://') || abs.startsWith('https://')) {
    return {
      url: abs,
      alt: options.title,
      width: 1200,
      height: 800,
      aspectRatio: 1.5,
    };
  }
  return { ...DEFAULT_COVER, alt: options.title };
}

function resolveIndustry(row: ProjectCaseRow): string {
  return (row.category || '').trim() || ' ';
}

function resolveRegion(row: ProjectCaseRow): string {
  return (row.author || '').trim() || ' ';
}

function buildMeta(author: string): string {
  const writer = author.trim();
  return writer ? `Writer: ${writer}` : '';
}

function slugifyTitle(title: string, id: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base ? `${base}-${id}` : `case-${id}`;
}

function absolutizeRichContentBlocks(
  blocks: ArticleContentBlock[],
  mediaBaseUrl: string,
): ArticleContentBlock[] {
  return blocks.map((block) => {
    if (block.type === 'image' && block.image?.url) {
      const url = block.image.url.startsWith('http')
        ? block.image.url
        : absoluteMediaUrl(block.image.url, mediaBaseUrl);
      return {
        ...block,
        image: {
          ...block.image,
          url: url || block.image.url,
        },
      };
    }
    return block;
  });
}

export function mapProjectCaseRowToSummary(row: ProjectCaseRow, mediaBaseUrl: string): CaseSummary {
  const id = String(row.id);
  const title = resolveTitle(row);
  const category = categoryFromRow(row);
  const industry = resolveIndustry(row);
  const region = resolveRegion(row);
  return {
    id,
    title,
    summary: resolveSummary(row, title),
    category,
    coverImage: resolveCover({
      coverUrl: row.cover_url,
      title,
      mediaBaseUrl,
    }),
    region,
    industry,
    featured: false,
  };
}

export function mapProjectCaseRowToDetail(row: ProjectCaseRow, mediaBaseUrl: string): CaseDetail {
  const summary = mapProjectCaseRowToSummary(row, mediaBaseUrl);
  const id = String(row.id);
  const rawHtml = row.content_html || '';
  const { blocks } = htmlToRichContent(`case-${id}`, rawHtml);
  return {
    ...summary,
    slug: slugifyTitle(summary.title, id),
    meta: buildMeta(summary.region),
    background: ' ',
    solution: ' ',
    richContent: absolutizeRichContentBlocks(blocks, mediaBaseUrl),
    relatedIds: [],
    publishedAt: toIsoDateTime(row.publish_time || row.update_datetime),
  };
}
