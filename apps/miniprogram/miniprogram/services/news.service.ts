import type { ArticleContentBlock, ImageResource, PaginatedData } from '../types/content';
import { formatDisplayDate, toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export interface NewsListQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  keyword?: string;
  featured?: boolean;
}

export interface NewsListItemView {
  id: string;
  title: string;
  date: string;
  image: string;
  category: string;
}

export interface NewsDetailView {
  id: string;
  title: string;
  date: string;
  image: string;
  category: string;
  summary: string;
  author: string;
  richContent: ArticleContentBlock[];
}

interface NewsSummaryDto {
  id: string;
  title: string;
  summary: string;
  category: { id: string; name: string };
  publishedAt: string;
  coverImage: ImageResource;
  featured: boolean;
  tags: string[];
}

interface NewsDetailDto extends NewsSummaryDto {
  slug: string;
  subtitle: string;
  author: { name: string };
  richContent: ArticleContentBlock[];
  relatedIds: string[];
}

export async function getNewsList(query: NewsListQuery = {}): Promise<{
  items: NewsListItemView[];
  hasNext: boolean;
  page: number;
}> {
  const data = await get<PaginatedData<NewsSummaryDto>>(API_ENDPOINTS.newsList, {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
    category: query.category,
    keyword: query.keyword,
    featured: query.featured,
  });
  return {
    items: data.items.map((item) => ({
      id: item.id,
      title: item.title,
      date: formatDisplayDate(item.publishedAt),
      image: toAssetUrl(item.coverImage),
      category: item.category.name,
    })),
    hasNext: data.pagination.hasNext,
    page: data.pagination.page,
  };
}

export async function getNewsDetail(id: string): Promise<NewsDetailView> {
  const data = await get<NewsDetailDto>(API_ENDPOINTS.newsDetail(id));
  return {
    id: data.id,
    title: data.title,
    date: formatDisplayDate(data.publishedAt),
    image: toAssetUrl(data.coverImage),
    category: data.category.name,
    summary: data.summary,
    author: data.author.name,
    richContent: data.richContent,
  };
}
