import type { ArticleContentBlock, EmployeeCareData, ImageResource } from '@app/shared';
import { mockEnv } from '../config/env';
import { prepareArticleHtml, sanitizeRichTextHtml } from './article-html.service';
import { htmlToRichContent } from './html-to-rich-content';
import { getFixtures } from './fixture.service';
import {
  fetchMiniCareArticle,
  isLocalGlobalCareEnabled,
} from './local-global-care.client';
import {
  resolveCareArticleAuthor,
  type MiniCareArticleDto,
} from './local-global-care-mini.mapper';
import {
  defaultCareCampus,
  getCachedMiniCareArticle,
  loadLiveEmployeeCare,
  rememberMiniCareArticles,
} from './local-global-care.service';

export type EmployeeCareArticleDetail = {
  id: string;
  title: string;
  category: string;
  date: string;
  author?: string;
  coverImage?: ImageResource;
  contentHtml: string;
  richContent?: ArticleContentBlock[];
  bodyFormat?: 'html' | 'blocks';
};

export function parseCareArticleRouteId(raw: string): number | null {
  const trimmed = raw.trim();
  const prefixed = /^care-(?:local|global)-(\d+)$/.exec(trimmed);
  if (prefixed) {
    return Number(prefixed[1]);
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return null;
}

export function mapMiniArticleToDetail(article: MiniCareArticleDto): EmployeeCareArticleDetail {
  const category = article.track === 'global' ? 'Global Care' : 'Local Care';
  const title = (article.title || '').trim() || category;
  const dateRaw = (article.publishedAt || '').trim();
  const date = /^\d{4}-\d{2}-\d{2}/.test(dateRaw) ? dateRaw.slice(0, 10) : dateRaw;
  const articleId = `care-${article.track}-${article.id}`;
  const rawHtml = article.contentHtml || '';
  const mediaBaseUrl = mockEnv.LOCAL_GLOBAL_CARE_MEDIA_BASE_URL;
  let blocks: ArticleContentBlock[] = [];
  let contentHtml = '';
  try {
    blocks = htmlToRichContent(articleId, rawHtml, { mediaBaseUrl }).blocks;
    const hasNativeBlocks = blocks.some((block) => block.type === 'carousel' || block.type === 'video');
    contentHtml = hasNativeBlocks
      ? sanitizeRichTextHtml(rawHtml)
      : prepareArticleHtml(articleId, rawHtml, { mediaBaseUrl });
  } catch {
    contentHtml = sanitizeRichTextHtml(rawHtml);
  }
  contentHtml = contentHtml || `<p>${title}</p>`;
  const author = resolveCareArticleAuthor(article);
  return {
    id: articleId,
    title,
    category,
    date,
    ...(author ? { author } : {}),
    contentHtml,
    richContent: blocks,
    bodyFormat: 'html',
    ...(article.coverImage?.url
      ? {
          coverImage: {
            url: article.coverImage.url,
            alt: article.coverImage.alt || title,
            width: 400,
            height: 300,
            aspectRatio: 1.33,
          },
        }
      : {}),
  };
}

function findInEmployeeCare(
  data: EmployeeCareData,
  routeId: string,
): EmployeeCareArticleDetail | null {
  const item = data.initiatives.find((row) => row.id === routeId);
  if (!item) {
    return null;
  }
  const escaped = item.description
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    date: item.date,
    ...(item.image ? { coverImage: item.image } : {}),
    contentHtml: `<p>${escaped}</p>`,
  };
}

export async function resolveEmployeeCareArticleDetail(
  routeId: string,
  campus = defaultCareCampus(),
): Promise<EmployeeCareArticleDetail | null> {
  const numericId = parseCareArticleRouteId(routeId);

  if (isLocalGlobalCareEnabled() && numericId != null) {
    try {
      const article = await fetchMiniCareArticle(numericId);
      if (article) {
        rememberMiniCareArticles([article]);
        return mapMiniArticleToDetail(article);
      }
    } catch {
      // fall through to list snapshot
    }
    const cachedMini = getCachedMiniCareArticle(numericId);
    if (cachedMini?.contentHtml) {
      return mapMiniArticleToDetail(cachedMini);
    }
  }

  const live = await loadLiveEmployeeCare(campus);
  const data = live ?? getFixtures().employeeCare;
  return findInEmployeeCare(data, routeId);
}
