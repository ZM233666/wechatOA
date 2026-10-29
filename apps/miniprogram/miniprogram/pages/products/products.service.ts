import type { ArticleContentBlock, ImageResource, PaginatedData } from '../types/content';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

const PRODUCT_SYSTEM_ALIASES: Record<string, string> = {
  braking: 'braking',
  door: 'door',
  'power-supply': 'power-supply',
  power: 'power-supply',
  'product-001': 'braking',
  'product-002': 'door',
  'product-003': 'power-supply',
};

export function resolveProductSystemId(id?: string): string | undefined {
  if (!id) {
    return undefined;
  }
  const normalized = id.trim().toLowerCase();
  return PRODUCT_SYSTEM_ALIASES[normalized];
}

export function getProductSystemHeading(system?: string): { cn: string; en: string } {
  switch (system) {
    case 'braking':
      return { cn: '制动系统产品', en: 'Braking Products' };
    case 'door':
      return { cn: '门系统产品', en: 'Door Products' };
    case 'power-supply':
      return { cn: '电源系统产品', en: 'Power Supply Products' };
    default:
      return { cn: '全部产品', en: 'All Products' };
  }
}

const PRODUCT_CATEGORY_CN: Record<string, string> = {
  braking: '制动系统',
  door: '门系统',
  power: '电源系统',
  'power-supply': '电源系统',
};

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

export interface ProductListItemView {
  id: string;
  name: string;
  summary: string;
  image: string;
  categoryId: string;
  categoryName: string;
  featured: boolean;
}

export interface ProductListQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  keyword?: string;
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

interface ProductSummaryDto {
  id: string;
  name: string;
  nameCn: string;
  summary: string;
  category: { id: string; name: string };
  coverImage: ImageResource;
  featured: boolean;
}

function resolveCategoryName(categoryId: string, nameCn?: string): string {
  return PRODUCT_CATEGORY_CN[categoryId] || nameCn || categoryId;
}

function mapProductSummary(item: ProductSummaryDto): ProductListItemView {
  return {
    id: item.id,
    name: item.name,
    summary: item.summary,
    image: toAssetUrl(item.coverImage),
    categoryId: item.category.id,
    categoryName: resolveCategoryName(item.category.id, item.nameCn),
    featured: item.featured,
  };
}

export async function getProductCategories(): Promise<{
  slides: ProductHeroSlide[];
  categories: ProductCategoryView[];
}> {
  const data = await get<ProductCategoriesDto>(API_ENDPOINTS.productCategories);
  const categories = data.categories
    .filter((item) => item.id !== 'digital' && item.featuredProductId !== 'product-004')
    .map((item) => ({
      id: item.featuredProductId,
      title: item.name,
      titleCn: item.nameCn,
      subtitleEn: item.subtitleEn,
      desc: item.description.trim() === '' ? '' : item.description,
      image: item.coverImage.url ? toAssetUrl(item.coverImage) : '',
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
    desc: data.description.trim() === ' ' ? '' : data.description,
    image: data.coverImage.url ? toAssetUrl(data.coverImage) : '',
    products: data.relatedProducts.map((item) => ({
      name: item.name,
      desc: item.description,
      img: toAssetUrl(item.image),
    })),
    richContent: [],
  };
}

export async function getProductList(
  query: ProductListQuery = {},
): Promise<{ items: ProductListItemView[]; hasNext: boolean }> {
  const data = await get<PaginatedData<ProductSummaryDto>>(API_ENDPOINTS.products, {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    category: query.category,
    keyword: query.keyword,
  });
  return {
    items: data.items.map(mapProductSummary),
    hasNext: data.pagination.hasNext,
  };
}
