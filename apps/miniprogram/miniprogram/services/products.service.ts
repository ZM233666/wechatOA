import type { ArticleContentBlock, ImageResource } from '../types/content';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export interface ProductHeroSlide {
  title: string;
  image: string;
}

export interface ProductItem {
  name: string;
  desc: string;
  img: string;
}

export interface ProductCategoryView {
  id: string;
  title: string;
  titleCn: string;
  subtitleEn: string;
  desc: string;
  image: string;
  products: ProductItem[];
  richContent: ArticleContentBlock[];
}

interface ProductCategoriesDto {
  slides: Array<{ title: string; image: ImageResource }>;
  categories: Array<{
    id: string;
    name: string;
    nameCn: string;
    subtitleEn: string;
    description: string;
    coverImage: ImageResource;
    featuredProductId: string;
  }>;
}

interface ProductDetailDto {
  id: string;
  name: string;
  nameCn: string;
  subtitleEn: string;
  summary: string;
  description: string;
  coverImage: ImageResource;
  relatedProducts: Array<{ name: string; description: string; image: ImageResource }>;
  richContent: ArticleContentBlock[];
}

export async function getProductCategories(): Promise<{
  slides: ProductHeroSlide[];
  categories: ProductCategoryView[];
}> {
  const data = await get<ProductCategoriesDto>(API_ENDPOINTS.productCategories);
  const categories = data.categories.map((item) => ({
    id: item.featuredProductId,
    title: item.name,
    titleCn: item.nameCn,
    subtitleEn: item.subtitleEn,
    desc: item.description,
    image: toAssetUrl(item.coverImage),
    products: [],
    richContent: [],
  }));
  return {
    slides: data.slides.map((item) => ({
      title: item.title,
      image: toAssetUrl(item.image),
    })),
    categories,
  };
}

export async function getProductDetail(id: string): Promise<ProductCategoryView> {
  const data = await get<ProductDetailDto>(API_ENDPOINTS.productDetail(id));
  return {
    id: data.id,
    title: data.name,
    titleCn: data.nameCn,
    subtitleEn: data.subtitleEn,
    desc: data.description,
    image: toAssetUrl(data.coverImage),
    products: data.relatedProducts.map((item) => ({
      name: item.name,
      desc: item.description,
      img: toAssetUrl(item.image),
    })),
    richContent: data.richContent,
  };
}
