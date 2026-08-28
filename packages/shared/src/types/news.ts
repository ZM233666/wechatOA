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
  /** 结构化正文（产品/案例/fixture 或兼容回退） */
  richContent: ArticleContentBlock[];
  /** wangEditor HTML，经服务端消毒与资源处理后下发；优先于 richContent 渲染 */
  contentHtml?: string;
  /** `html` 时使用 contentHtml；`blocks` 时使用 richContent */
  bodyFormat?: 'html' | 'blocks';
  relatedArticles: NewsSummary[];
  share: NewsShare;
}

export interface NewsCategoryListData {
  items: NewsCategory[];
}
