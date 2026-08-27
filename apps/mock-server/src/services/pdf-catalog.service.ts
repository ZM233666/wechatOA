import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ImageResource, InsightReport, ServiceSummary } from '@app/shared';

const ROOT = path.resolve(__dirname, '../../');
const FIXTURES_DIR = path.join(ROOT, 'fixtures');

const PLACEHOLDER_COVER: ImageResource = {
  url: '/mock-assets/services/digital-cbm-cover.png',
  alt: 'PDF cover',
  width: 800,
  height: 1000,
  aspectRatio: 0.8,
};

const DEFAULT_ICON: ImageResource = {
  url: '/mock-assets/services/icon-monitor.png',
  alt: '洞察图标',
  width: 64,
  height: 64,
  aspectRatio: 1,
};

/** PDF 文件名 → 稳定 ASCII id（中文名用 hash，避免路由/download 兼容问题） */
export function pdfFileNameToId(fileName: string): string {
  const stem = fileName.replace(/\.pdf$/i, '');
  if (/^[A-Za-z0-9._-]+$/.test(stem)) {
    return stem;
  }
  const hash = createHash('sha1').update(fileName).digest('hex').slice(0, 10);
  return `pdf-${hash}`;
}

export function pdfFileNameToTitle(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim() || fileName;
}

export function listPdfFileNames(relativeDir: string): Array<{ fileName: string; mtimeMs: number }> {
  const absoluteDir = path.join(FIXTURES_DIR, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }
  return fs
    .readdirSync(absoluteDir)
    .filter((name) => name.toLowerCase().endsWith('.pdf') && !name.startsWith('.'))
    .map((fileName) => {
      const absolute = path.join(absoluteDir, fileName);
      return {
        fileName,
        mtimeMs: fs.statSync(absolute).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export function buildSyntheticInsight(fileName: string): {
  id: string;
  title: string;
  titleEn: string;
  caption: string;
  kicker: string;
  english: string;
  coverImage: ImageResource;
  gating: boolean;
  tag: string;
  pdfFile: string;
} {
  const id = pdfFileNameToId(fileName);
  const title = pdfFileNameToTitle(fileName);
  return {
    id,
    title,
    titleEn: title,
    caption: title,
    kicker: 'KB Insights',
    english: 'PDF Report',
    coverImage: { ...PLACEHOLDER_COVER, alt: title },
    gating: false,
    tag: 'PDF',
    pdfFile: fileName,
  };
}

export function buildSyntheticWetalk(fileName: string): {
  id: string;
  title: string;
  date: string;
  coverImage: ImageResource;
  pdfFile: string;
} {
  const id = pdfFileNameToId(fileName);
  const title = pdfFileNameToTitle(fileName);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ' / ');
  return {
    id,
    title,
    date,
    coverImage: { ...PLACEHOLDER_COVER, alt: title },
    pdfFile: fileName,
  };
}

export function insightReportToCover(
  report: InsightReport,
  template?: ServiceSummary,
): ServiceSummary {
  return {
    id: report.id,
    title: report.title,
    subtitle: report.kicker || 'KB Insights',
    footerTitle: '智库与行业洞察',
    footerHint: '探索更多',
    coverImage: report.coverImage,
    icon: template?.icon ?? DEFAULT_ICON,
    iconTone: template?.iconTone ?? 'blue',
    showOnline: false,
    kind: 'insight',
    kicker: report.kicker,
    english: report.english,
    caption: report.caption,
    tag: report.tag ?? (report.pdfUrl ? 'PDF' : undefined),
    gating: report.gating,
  };
}

export function pickLatestInsightCovers(
  reports: InsightReport[],
  fallbackCovers: ServiceSummary[],
  limit = 2,
): ServiceSummary[] {
  const template = fallbackCovers[0];
  // 上级页：优先最近 PDF，不足再用非 PDF 封面补齐到 limit
  const withPdf = reports.filter((item) => item.pdfUrl);
  const withoutPdf = reports.filter((item) => !item.pdfUrl);
  const ranked = [...withPdf, ...withoutPdf];
  const covers = ranked.slice(0, limit).map((item) => insightReportToCover(item, template));
  if (covers.length >= limit) {
    return covers;
  }
  for (const cover of fallbackCovers) {
    if (covers.some((item) => item.id === cover.id)) {
      continue;
    }
    covers.push(cover);
    if (covers.length >= limit) {
      break;
    }
  }
  return covers;
}

/** 按 files/ 内 PDF 的 mtime 对报告排序（新的在前） */
export function sortReportsByPdfMtime<T extends { id: string; pdfUrl?: string }>(
  reports: T[],
  pdfRelativeDir: string,
): T[] {
  const mtimes = new Map(listPdfFileNames(pdfRelativeDir).map((item) => [item.fileName, item.mtimeMs]));
  const score = (item: T): number => {
    if (!item.pdfUrl) {
      return 0;
    }
    const fileName = decodeURIComponent(item.pdfUrl.split('/').pop() || '');
    return mtimes.get(fileName) ?? 0;
  };
  return [...reports].sort((a, b) => score(b) - score(a) || b.id.localeCompare(a.id));
}
