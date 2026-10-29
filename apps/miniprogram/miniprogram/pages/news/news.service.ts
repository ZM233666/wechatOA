import type { ArticleContentBlock, ImageResource, PaginatedData } from '../../types/content';
import { formatDisplayDate, toAssetUrl } from '../../utils/format';
import { API_ENDPOINTS } from '../../services/endpoints';
import { get } from '../../services/request';

export interface NewsListQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  keyword?: string;
  featured?: boolean;
}

export interface NewsCategoryView {
  id: string;
  name: string;
  articleCount: number;
}

export interface NewsListItemView {
  id: string;
  title: string;
  summary: string;
  date: string;
  image: string;
  category: string;
  featured: boolean;
  pinned: boolean;
}

export interface NewsDetailView {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  image: string;
  category: string;
  summary: string;
  author: string;
  source: string;
  tags: string[];
  richContent: ArticleContentBlock[];
  contentHtml?: string;
  bodyFormat?: 'html' | 'blocks';
  shareTitle: string;
  shareSummary: string;
  shareImage: string;
}

interface NewsTagDto {
  id: string;
  name: string;
}

interface NewsSummaryDto {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  category: { id: string; name: string };
  publishedAt: string;
  coverImage: ImageResource;
  thumbnailImage?: ImageResource;
  featured: boolean;
  pinned: boolean;
  tags: NewsTagDto[];
}

interface NewsDetailDto extends NewsSummaryDto {
  author: { id: string; name: string; avatar: ImageResource | null };
  source: { name: string; url: string | null };
  richContent: ArticleContentBlock[];
  contentHtml?: string;
  bodyFormat?: 'html' | 'blocks';
  relatedArticles: NewsSummaryDto[];
  share: { title: string; summary: string; imageUrl: string };
}

const NEWS_DETAIL_CACHE_TTL_MS = 5 * 60_000;
const newsDetailCache = new Map<
  string,
  { value: NewsDetailView; expiresAt: number }
>();
const newsDetailRequests = new Map<string, Promise<NewsDetailView>>();

function mapListItem(item: NewsSummaryDto): NewsListItemView {
  return {
    id: item.id,
    title: item.title,
    summary: (item.summary || '').trim(),
    date: formatDisplayDate(item.publishedAt),
    image: toAssetUrl(item.thumbnailImage ?? item.coverImage),
    category: item.category.name,
    featured: item.featured,
    pinned: item.pinned,
  };
}

export async function getNewsCategories(): Promise<NewsCategoryView[]> {
  const data = await get<{ items: NewsCategoryView[] }>(API_ENDPOINTS.newsCategories);
  return data.items;
}

export async function getNewsList(query: NewsListQuery = {}): Promise<{
  items: NewsListItemView[];
  hasNext: boolean;
  page: number;
}> {
  const data = await get<PaginatedData<NewsSummaryDto>>(API_ENDPOINTS.newsList, {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
    ...(query.category && query.category !== 'all' ? { category: query.category } : {}),
    ...(query.keyword ? { keyword: query.keyword } : {}),
    ...(query.featured !== undefined ? { featured: query.featured } : {}),
  });
  return {
    items: data.items.map(mapListItem),
    hasNext: data.pagination.hasNext,
    page: data.pagination.page,
  };
}

async function fetchNewsDetail(id: string): Promise<NewsDetailView> {
  const data = await get<NewsDetailDto>(API_ENDPOINTS.newsDetail(id));
  const cover = toAssetUrl(data.coverImage);
  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle,
    date: formatDisplayDate(data.publishedAt),
    image: cover,
    category: data.category.name,
    summary: data.summary,
    author: data.author.name,
    source: data.source.name,
    tags: data.tags.map((tag) => tag.name),
    richContent: data.richContent,
    contentHtml: data.contentHtml,
    bodyFormat: data.bodyFormat,
    shareTitle: data.share?.title || data.title,
    shareSummary: data.share?.summary || data.summary,
    shareImage: data.share?.imageUrl ? toAssetUrl(data.share.imageUrl) : cover,
  };
}

export async function getNewsDetail(id: string): Promise<NewsDetailView> {
  const cached = newsDetailCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  if (cached) {
    newsDetailCache.delete(id);
  }

  const pending = newsDetailRequests.get(id);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const detail = await fetchNewsDetail(id);
      const expiresAt = Date.now() + NEWS_DETAIL_CACHE_TTL_MS;
      newsDetailCache.set(id, { value: detail, expiresAt });
      newsDetailCache.set(detail.id, { value: detail, expiresAt });
      return detail;
    } finally {
      newsDetailRequests.delete(id);
    }
  })();
  newsDetailRequests.set(id, request);
  return request;
}

export function prefetchNewsDetails(ids: string[]): void {
  [...new Set(ids.filter(Boolean))].forEach((id) => {
    void getNewsDetail(id).catch(() => {
      // 预取失败不影响列表；用户进入详情页时仍可主动重试。
    });
  });
}
