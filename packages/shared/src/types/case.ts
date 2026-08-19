import type { ImageResource } from './image';
import type { ArticleContentBlock } from './article';

export interface CaseCategory {
  id: string;
  name: string;
}

export interface CaseSummary {
  id: string;
  title: string;
  summary: string;
  category: CaseCategory;
  coverImage: ImageResource;
  region: string;
  industry: string;
  featured: boolean;
}

export interface CaseDetail {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: CaseCategory;
  coverImage: ImageResource;
  region: string;
  industry: string;
  meta: string;
  background: string;
  solution: string;
  richContent: ArticleContentBlock[];
  relatedIds: string[];
  publishedAt: string;
}
