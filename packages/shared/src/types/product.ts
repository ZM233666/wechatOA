import type { ImageResource } from './image';
import type { ArticleContentBlock } from './article';

export interface ProductCategory {
  id: string;
  name: string;
  nameCn: string;
  subtitleEn: string;
  description: string;
  coverImage: ImageResource;
  featuredProductId: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  nameCn: string;
  summary: string;
  category: {
    id: string;
    name: string;
  };
  coverImage: ImageResource;
  featured: boolean;
}

export interface RelatedProductItem {
  name: string;
  description: string;
  image: ImageResource;
}

export interface ProductHeroSlide {
  title: string;
  image: ImageResource;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  nameCn: string;
  subtitleEn: string;
  summary: string;
  description: string;
  category: {
    id: string;
    name: string;
  };
  coverImage: ImageResource;
  gallery: ImageResource[];
  relatedProducts: RelatedProductItem[];
  richContent: ArticleContentBlock[];
  relatedIds: string[];
  publishedAt: string;
}

export interface ProductCategoriesData {
  categories: ProductCategory[];
  slides: ProductHeroSlide[];
}
