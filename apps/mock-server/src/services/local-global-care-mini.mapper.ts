import type { EmployeeCareData, ImageResource } from '@app/shared';
import { mockEnv } from '../config/env';
import { extractPlainTextFromHtml } from './article-html.service';

const DEFAULT_HERO_IMAGE: ImageResource = {
  url: '/mock-assets/kb-life/care.png',
  alt: 'Employee Care',
  width: 800,
  height: 400,
  aspectRatio: 2,
};

export type MiniCareArticleDto = {
  id: number;
  track: string;
  title: string;
  contentHtml: string;
  publishedAt: string;
  showOnKbLifeBanner: boolean;
  coverImage?: { url: string; alt?: string } | null;
  /** Mini 契约：CMS 文稿 `author`，有值才展示 */
  author?: string;
};

export function resolveCareArticleAuthor(article: MiniCareArticleDto): string {
  return (article.author || '').trim();
}

export type MiniLocalGlobalCarePayload = {
  campus: string;
  local: { banner: MiniCareArticleDto[]; articles: MiniCareArticleDto[] };
  global: { banner: MiniCareArticleDto[]; articles: MiniCareArticleDto[] };
};

export function collectMiniCareArticles(payload: MiniLocalGlobalCarePayload): MiniCareArticleDto[] {
  const seen = new Set<number>();
  const articles: MiniCareArticleDto[] = [];
  for (const item of [
    ...(payload.local?.articles ?? []),
    ...(payload.global?.articles ?? []),
    ...(payload.local?.banner ?? []),
    ...(payload.global?.banner ?? []),
  ]) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    articles.push(item);
  }
  return articles;
}

function resolveMediaUrl(storedUrl: string): string {
  const raw = (storedUrl || '').trim();
  if (!raw) {
    return '';
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  if (raw.startsWith('/mock-assets/')) {
    return raw;
  }
  const base = mockEnv.LOCAL_GLOBAL_CARE_MEDIA_BASE_URL.replace(/\/+$/, '');
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`;
}

function toImage(url: string, alt: string): ImageResource {
  const resolved = resolveMediaUrl(url);
  if (!resolved) {
    return { ...DEFAULT_HERO_IMAGE, alt };
  }
  return {
    url: resolved,
    alt,
    width: 400,
    height: 300,
    aspectRatio: 1.33,
  };
}

function initiativeCoverImage(url: string | undefined, alt: string): ImageResource | undefined {
  const raw = (url || '').trim();
  if (!raw) {
    return undefined;
  }
  return toImage(raw, alt);
}

function excerpt(html: string, maxLen = 220): string {
  const text = extractPlainTextFromHtml(html).replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen - 1)}…`;
}

function trackCategory(track: string): string {
  return track === 'global' ? 'Global Care' : 'Local Care';
}

export function mapMiniCareArticleToInitiative(
  article: MiniCareArticleDto,
): EmployeeCareData['initiatives'][number] {
  const category = trackCategory(article.track);
  const title = (article.title || '').trim() || category;
  const dateRaw = (article.publishedAt || '').trim();
  const date = /^\d{4}-\d{2}-\d{2}/.test(dateRaw) ? dateRaw.slice(0, 10) : dateRaw;
  const cover = initiativeCoverImage(article.coverImage?.url, title);
  return {
    id: `care-${article.track}-${article.id}`,
    title,
    category,
    date,
    description: excerpt(article.contentHtml || '') || title,
    ...(cover ? { image: cover } : {}),
    showOnKbLifeBanner: Boolean(article.showOnKbLifeBanner),
  };
}

/** Django Mini：/api/v1/mini/kb-life/local-global-care/ */
export function mapMiniLocalGlobalCareToEmployeeCare(
  payload: MiniLocalGlobalCarePayload,
  fallbackHero?: EmployeeCareData['hero'],
): EmployeeCareData {
  const seen = new Set<number>();
  const articles: MiniCareArticleDto[] = [];
  for (const item of [...(payload.local?.articles ?? []), ...(payload.global?.articles ?? [])]) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    articles.push(item);
  }

  const initiatives = articles.map(mapMiniCareArticleToInitiative);
  initiatives.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id));

  /** 列表页不展示置顶稿 Hero，仅保留通用占位（小程序 Employee Care 已隐藏 Hero） */
  return {
    hero: {
      title: fallbackHero?.title || 'Local / Global Care',
      subtitle:
        fallbackHero?.subtitle ||
        'Social engagement at Knorr-Bremse locations.',
      image: fallbackHero?.image || DEFAULT_HERO_IMAGE,
    },
    initiatives,
  };
}
