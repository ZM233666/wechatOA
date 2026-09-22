import type { z } from 'zod';
import type { productCategoriesFileSchema, productDetailSchema, productSummarySchema } from '../schemas/product.schema';
import { absoluteMediaUrl } from './article-html-media';
import {
  PRODUCT_INTRO_SYSTEMS,
  type ProductIntroRow,
  type ProductIntroSystemSlug,
  resolveProductIntroSystemSlug,
} from './product-intro.client';
import type {
  ProductIntroPublicDetail,
  ProductIntroPublicSummary,
} from './product-intro.types';

type ProductCategoriesData = z.infer<typeof productCategoriesFileSchema>;
type ProductDetail = z.infer<typeof productDetailSchema>;
type ProductCategory = ProductCategoriesData['categories'][number];
type ProductSummary = z.infer<typeof productSummarySchema>;

function emptyCoverImage(alt: string) {
  return {
    url: '',
    alt,
    width: 1200,
    height: 800,
    aspectRatio: 1.5,
  };
}

function toImageResource(url: string, alt: string) {
  return {
    url,
    alt,
    width: 1200,
    height: 800,
    aspectRatio: 1.5,
  };
}

function resolveCoverUrl(
  row: ProductIntroRow | undefined,
  mediaBaseUrl: string,
  alt: string,
) {
  const raw = row?.cover_url?.trim() ?? '';
  if (!raw) {
    return emptyCoverImage(alt);
  }
  const url = absoluteMediaUrl(raw, mediaBaseUrl);
  return toImageResource(url, alt);
}

function buildProductDescription(row: ProductIntroRow): string {
  const parts: string[] = [];
  if (row.summary?.trim()) {
    parts.push(row.summary.trim());
  }
  (row.detail_items ?? []).forEach((item) => {
    const title = item.title?.trim();
    const content = item.content?.trim();
    if (title && content) {
      parts.push(`${title}: ${content}`);
    } else if (title || content) {
      parts.push(title || content || '');
    }
  });
  return parts.join('\n') || ' ';
}

/** 仅返回 is_top=true 的置顶产品；无置顶则 undefined（不使用其他产品回退） */
export function pickTopProduct(products: ProductIntroRow[]): ProductIntroRow | undefined {
  const topProducts = products.filter((item) => item.is_top);
  if (!topProducts.length) {
    return undefined;
  }
  return [...topProducts].sort((a, b) => {
    const aTime = Date.parse(String(a.update_datetime ?? a.publish_time ?? '')) || 0;
    const bTime = Date.parse(String(b.update_datetime ?? b.publish_time ?? '')) || 0;
    return bTime - aTime;
  })[0];
}

export function mapSystemProductsToCategory(
  systemSlug: ProductIntroSystemSlug,
  products: ProductIntroRow[],
  mediaBaseUrl: string,
): ProductCategory {
  const meta = PRODUCT_INTRO_SYSTEMS.find((item) => item.slug === systemSlug)!;
  const coverProduct = pickTopProduct(products);
  return {
    id: systemSlug,
    name: meta.name,
    nameCn: meta.nameCn,
    subtitleEn: meta.subtitleEn,
    description: coverProduct?.summary?.trim() || ' ',
    coverImage: coverProduct
      ? resolveCoverUrl(
          coverProduct,
          mediaBaseUrl,
          coverProduct.product_name || meta.nameCn,
        )
      : emptyCoverImage(meta.nameCn),
    featuredProductId: systemSlug,
  };
}

export function mapSystemProductsToCategoriesData(
  systemProducts: Partial<Record<ProductIntroSystemSlug, ProductIntroRow[]>>,
  mediaBaseUrl: string,
  fixtureFallback: ProductCategoriesData,
): ProductCategoriesData {
  const categories = PRODUCT_INTRO_SYSTEMS.map((system) => {
    const products = systemProducts[system.slug] ?? [];
    return mapSystemProductsToCategory(system.slug, products, mediaBaseUrl);
  });

  return {
    slides: fixtureFallback.slides,
    categories,
  };
}

export function mapSystemProductsToDetail(
  systemSlug: ProductIntroSystemSlug,
  products: ProductIntroRow[],
  mediaBaseUrl: string,
): ProductDetail {
  const meta = PRODUCT_INTRO_SYSTEMS.find((item) => item.slug === systemSlug)!;
  const sorted = [...products].sort((a, b) => {
    const coreDiff = Number(Boolean(b.is_core_product)) - Number(Boolean(a.is_core_product));
    if (coreDiff !== 0) {
      return coreDiff;
    }
    const aTime = Date.parse(String(a.update_datetime ?? a.publish_time ?? '')) || 0;
    const bTime = Date.parse(String(b.update_datetime ?? b.publish_time ?? '')) || 0;
    return bTime - aTime;
  });
  const topProduct = pickTopProduct(products);
  const coreProducts = sorted.filter((item) => item.is_core_product);
  const topDescription = topProduct ? buildProductDescription(topProduct) : '';

  return {
    id: systemSlug,
    slug: systemSlug,
    name: topProduct?.product_name?.trim() || '',
    nameCn: meta.nameCn,
    subtitleEn: meta.subtitleEn,
    summary: topProduct?.summary?.trim() || '',
    description: topDescription.trim() || ' ',
    category: { id: systemSlug, name: meta.name },
    coverImage: topProduct
      ? resolveCoverUrl(topProduct, mediaBaseUrl, topProduct.product_name || meta.nameCn)
      : emptyCoverImage(meta.nameCn),
    gallery: topProduct?.cover_url
      ? [resolveCoverUrl(topProduct, mediaBaseUrl, topProduct.product_name || meta.nameCn)]
      : [],
    relatedProducts: coreProducts.map((item) => ({
      name: item.product_name?.trim() || meta.nameCn,
      description: buildProductDescription(item),
      image: resolveCoverUrl(item, mediaBaseUrl, item.product_name || meta.nameCn),
    })),
    richContent: [],
    relatedIds: coreProducts.map((item) => String(item.id)),
    publishedAt: topProduct?.publish_time
      ? new Date(topProduct.publish_time.replace(' ', 'T')).toISOString()
      : new Date().toISOString(),
  };
}

export function resolveDetailSystemSlug(id: string): ProductIntroSystemSlug | null {
  return resolveProductIntroSystemSlug(id);
}

export function mapProductIntroRowToProductSummary(
  row: ProductIntroRow,
  systemSlug: ProductIntroSystemSlug,
  mediaBaseUrl: string,
): ProductSummary {
  const meta = PRODUCT_INTRO_SYSTEMS.find((item) => item.slug === systemSlug)!;
  return {
    id: String(row.id),
    name: row.product_name?.trim() || meta.nameCn,
    nameCn: meta.nameCn,
    summary: row.summary?.trim() || ' ',
    category: { id: systemSlug, name: meta.name },
    coverImage: resolveCoverUrl(row, mediaBaseUrl, row.product_name?.trim() || meta.nameCn),
    featured: Boolean(row.is_core_product),
  };
}

export function mapProductIntroRowToSummary(
  row: ProductIntroRow,
  mediaBaseUrl: string,
): ProductIntroPublicSummary {
  const rawCover = row.cover_url?.trim() ?? '';
  return {
    id: String(row.id),
    productName: row.product_name?.trim() || '',
    productNo: row.product_no?.trim() || '',
    summary: row.summary?.trim() || '',
    category: row.category?.trim() || '',
    coverUrl: rawCover ? absoluteMediaUrl(rawCover, mediaBaseUrl) : '',
    isCoreProduct: Boolean(row.is_core_product),
    publishTime: row.publish_time ?? null,
    updateDatetime: row.update_datetime ?? '',
  };
}

export function mapProductIntroRowToDetail(
  row: ProductIntroRow,
  mediaBaseUrl: string,
): ProductIntroPublicDetail {
  return {
    ...mapProductIntroRowToSummary(row, mediaBaseUrl),
    detailItems: row.detail_items ?? [],
  };
}
