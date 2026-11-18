import type { Request } from 'express';
import { resolveCatalogPdfCoverUrl } from './article-wetalk.service';
import { resolvePublicBaseUrl, withAbsoluteAssets } from './asset-url.service';
import type { WetalkResource } from './wetalk-mini.client';

type WetalkMiniItem = {
  id: number;
  pdfUrl: string;
  pdfFileName: string;
  coverUrl: string;
};

export function isWeakWetalkCover(url: string): boolean {
  const value = (url || '').trim().toLowerCase();
  if (!value) {
    return true;
  }
  return (
    value.includes('care.png') ||
    value.includes('placeholder') ||
    value.includes('news-001-cover') ||
    value.includes('wetalk-coverpage.png')
  );
}

function mapWetalkItem<T extends WetalkMiniItem>(req: Request, item: T, resource: WetalkResource): T {
  const absolutized = withAbsoluteAssets(req, item);
  if (!absolutized.pdfUrl?.trim() || !isWeakWetalkCover(absolutized.coverUrl)) {
    return absolutized;
  }
  const catalog = resolveCatalogPdfCoverUrl(absolutized.pdfFileName);
  const coverUrl = catalog
    ? withAbsoluteAssets(req, { coverUrl: catalog }).coverUrl
    : `${resolvePublicBaseUrl(req)}/api/wetalk/${resource}/${absolutized.id}/cover`;
  return { ...absolutized, coverUrl };
}

export function enrichWetalkMiniPayload<T extends WetalkMiniItem>(
  req: Request,
  data: T | { items: T[]; total: number; page: number; limit: number },
  resource: WetalkResource,
) {
  if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
    return {
      ...data,
      items: data.items.map((item) => mapWetalkItem(req, item, resource)),
    };
  }
  return mapWetalkItem(req, data as T, resource);
}