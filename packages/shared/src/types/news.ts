import type { ImageResource } from './image';
import type { ArticleCategory, ArticleContentBlock } from './article';

export type NewsPublicationStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface NewsCategory {
  id: string;
  name: string;
  articleCount?: number;
}

export interface NewsTag {
  id: string;
  name: string;
}

export interface NewsAuthor {
  id: string;
  name: string;
  avatar: ImageResource | null;
}

export interface NewsSource {
  name: string;
  url: string | null;
}

export interface NewsPlacement {
  showOnHome: boolean;
  showOnBanner: boolean;
  featured: boolean;
  pinned: boolean;
  sortOrder: number;
}

export interface NewsShare {
  title: string;
  summary: string;
  imageUrl: string;
}

export interface NewsSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  category: ArticleCategory;
  publishedAt: string;
  coverImage: ImageResource;
  thumbnailImage?: ImageResource;
  featured: boolean;
  pinned: boolean;
  tags: NewsTag[];
}

export interface NewsDetail extends NewsSummary {
  author: NewsAuthor;
  source: NewsSource;
  richContent: ArticleContentBlock[];
  relatedArticles: NewsSummary[];
  share: NewsShare;
}

export interface NewsCategoryListData {
  items: NewsCategory[];
}
