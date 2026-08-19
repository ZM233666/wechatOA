import type { ImageResource } from './image';
import type { ArticleCategory, ArticleDetail } from './article';

export interface NewsCategory {
  id: string;
  name: string;
}

export interface NewsSummary {
  id: string;
  title: string;
  summary: string;
  category: ArticleCategory;
  publishedAt: string;
  coverImage: ImageResource;
  featured: boolean;
  tags: string[];
}

export type NewsDetail = ArticleDetail;
