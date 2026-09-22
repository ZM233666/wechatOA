import type { z } from 'zod';
import { mockEnv } from '../config/env';
import type { productCategoriesFileSchema, productDetailSchema, productSummarySchema } from '../schemas/product.schema';
import { getFixtures } from './fixture.service';
import { logInfo, logWarn } from '../utils/logger';
import {
  fetchProductIntroDetail,
  fetchProductIntroList,
  isProductIntroEnabled,
  PRODUCT_INTRO_SYNC_TTL_MS,
  PRODUCT_INTRO_SYSTEMS,
  type ProductIntroRow,
  type ProductIntroSystemSlug,
} from './product-intro.client';
import {
  mapProductIntroRowToDetail,
  mapProductIntroRowToProductSummary,
  mapProductIntroRowToSummary,
  mapSystemProductsToCategoriesData,
  mapSystemProductsToDetail,
  resolveDetailSystemSlug,
} from './product-intro.mapper';
import type {
  ProductIntroPublicDetail,
  ProductIntroPublicSummary,
  ProductIntroSystem,
} from './product-intro.types';

type ProductCategoriesData = z.infer<typeof productCategoriesFileSchema>;
type ProductDetail = z.infer<typeof productDetailSchema>;
type ProductSummary = z.infer<typeof productSummarySchema>;

type SyncState = {
  lastAttemptMs: number;
  lastSuccessMs: number;
  lastError?: string;
  inFlight: Promise<void> | null;
  systemProducts: Partial<Record<ProductIntroSystemSlug, ProductIntroRow[]>>;
  categories: ProductCategoriesData | null;
};

const state: SyncState = {
  lastAttemptMs: 0,
  lastSuccessMs: 0,
  inFlight: null,
  systemProducts: {},
  categories: null,
};

const LEGACY_CATEGORY_MAP: Record<ProductIntroSystem, string[]> = {
  braking: ['braking'],
  door: ['door'],
  'power-supply': ['power-supply', 'power'],
};

function mediaBaseUrl(): string {
  return mockEnv.PRODUCT_INTRO_MEDIA_BASE_URL.replace(/\/+$/, '');
}

function filterRows(
  rows: ProductIntroRow[],
  filters: { category?: string; isCoreProduct?: boolean },
): ProductIntroRow[] {
  return rows.filter((row) => {
    if (filters.category && row.category !== filters.category) {
      return false;
    }
    if (filters.isCoreProduct === true && !row.is_core_product) {
      return false;
    }
    if (filters.isCoreProduct === false && row.is_core_product) {
      return false;
    }
    return true;
  });
}

function getLegacyFixtureRows(system: ProductIntroSystem): ProductIntroRow[] {
  const categoryIds = LEGACY_CATEGORY_MAP[system];
  return getFixtures()
    .products.filter((item) => categoryIds.includes(item.category.id))
    .map((item) => ({
      id: item.id,
      product_name: item.name,
      category: item.category.id,
      product_no: item.id,
      summary: item.summary,
      cover_url: item.coverImage.url,
      is_core_product: item.featured,
      // fixture 无 is_top 字段：仅首个 featured 产品视为置顶
      is_top: item.featured,
      publish_time: new Date().toISOString(),
      update_datetime: new Date().toISOString(),
      status: 'published',
    }));
}

function getFixtureDetailByIdOrSystem(id: string): ProductDetail | undefined {
  const fixtures = getFixtures();
  const direct = fixtures.productDetails.find((item) => item.id === id);
  if (direct) {
    return direct;
  }
  const systemSlug = resolveDetailSystemSlug(id);
  if (!systemSlug) {
    return undefined;
  }
  const meta = PRODUCT_INTRO_SYSTEMS.find((item) => item.slug === systemSlug);
  const legacyIds = meta?.legacyIds ?? [systemSlug];
  return fixtures.productDetails.find(
    (item) =>
      legacyIds.includes(item.id) ||
      legacyIds.includes(item.slug) ||
      legacyIds.includes(item.category.id),
  );
}

export async function syncProductIntro(options?: {
  force?: boolean;
  ttlMs?: number;
}): Promise<void> {
  if (!isProductIntroEnabled()) {
    return;
  }
  const ttlMs = options?.ttlMs ?? PRODUCT_INTRO_SYNC_TTL_MS;
  const now = Date.now();
  if (!options?.force && state.inFlight) {
    await state.inFlight;
    return;
  }
  if (!options?.force && now - state.lastSuccessMs < ttlMs && state.categories) {
    return;
  }

  const run = (async () => {
    state.lastAttemptMs = Date.now();
    try {
      const systemProducts: Partial<Record<ProductIntroSystemSlug, ProductIntroRow[]>> = {};
      for (const system of PRODUCT_INTRO_SYSTEMS) {
        try {
          const rows = await fetchProductIntroList(system.slug);
          systemProducts[system.slug] = rows;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          logWarn('Product intro system sync failed', { system: system.slug, message });
          systemProducts[system.slug] = [];
        }
      }
      state.systemProducts = systemProducts;
      state.categories = mapSystemProductsToCategoriesData(
        systemProducts,
        mediaBaseUrl(),
        getFixtures().productCategories,
      );
      state.lastSuccessMs = Date.now();
      state.lastError = undefined;
      logInfo('Synced product intro from backend', {
        systems: Object.keys(systemProducts),
        total: Object.values(systemProducts).reduce((sum, rows) => sum + rows.length, 0),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      state.lastError = message;
      logWarn('Product intro sync failed; keeping previous cache/fixtures fallback', { message });
    } finally {
      state.inFlight = null;
    }
  })();

  state.inFlight = run;
  await run;
}

export function refreshProductIntroInBackground(): void {
  if (!isProductIntroEnabled()) {
    return;
  }
  void syncProductIntro();
}

export function getCachedProductCategories(): ProductCategoriesData | null {
  return state.categories;
}

export function getCachedSystemProducts(system: ProductIntroSystemSlug): ProductIntroRow[] {
  return state.systemProducts[system] ?? [];
}

export function getProductIntroStatus(): {
  enabled: boolean;
  count: number;
  lastError?: string;
  lastSuccessMs: number;
} {
  const count = Object.values(state.systemProducts).reduce((sum, rows) => sum + rows.length, 0);
  return {
    enabled: isProductIntroEnabled(),
    count,
    lastError: state.lastError,
    lastSuccessMs: state.lastSuccessMs,
  };
}

export async function getProductCategoriesForRequest(): Promise<ProductCategoriesData> {
  if (isProductIntroEnabled()) {
    let categories = getCachedProductCategories();
    if (!categories) {
      await syncProductIntro({ force: true });
      categories = getCachedProductCategories();
    } else {
      refreshProductIntroInBackground();
    }
    if (categories) {
      return categories;
    }
  }
  return getFixtures().productCategories;
}

export async function getProductDetailForRequest(id: string): Promise<ProductDetail | null> {
  const systemSlug = resolveDetailSystemSlug(id);
  if (systemSlug && isProductIntroEnabled()) {
    if (!getCachedProductCategories()) {
      await syncProductIntro({ force: true });
    } else {
      refreshProductIntroInBackground();
    }
    return mapSystemProductsToDetail(systemSlug, getCachedSystemProducts(systemSlug), mediaBaseUrl());
  }
  return getFixtureDetailByIdOrSystem(id) ?? null;
}

async function loadSystemRows(system: ProductIntroSystem): Promise<ProductIntroRow[]> {
  let rows = getCachedSystemProducts(system);
  if (isProductIntroEnabled()) {
    if (rows.length) {
      return rows;
    }
    try {
      rows = await fetchProductIntroList(system);
      state.systemProducts[system] = rows;
      return rows;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Product intro list fetch failed', { system, message });
      return [];
    }
  }
  if (rows.length) {
    return rows;
  }
  return getLegacyFixtureRows(system);
}

export async function getProductIntroListForRequest(
  system: ProductIntroSystem,
  filters: { category?: string; isCoreProduct?: boolean },
): Promise<ProductIntroPublicSummary[]> {
  const rows = filterRows(await loadSystemRows(system), filters);
  return rows.map((row) => mapProductIntroRowToSummary(row, mediaBaseUrl()));
}

export async function getProductIntroDetailForRequest(
  system: ProductIntroSystem,
  id: string,
): Promise<ProductIntroPublicDetail | null> {
  const rows = await loadSystemRows(system);
  const matched = rows.find((row) => String(row.id) === String(id));
  if (matched) {
    return mapProductIntroRowToDetail(matched, mediaBaseUrl());
  }
  if (isProductIntroEnabled()) {
    try {
      const row = await fetchProductIntroDetail(system, id);
      if (row) {
        return mapProductIntroRowToDetail(row, mediaBaseUrl());
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Product intro detail fetch failed', { system, id, message });
    }
  }
  const legacy = getLegacyFixtureRows(system).find((row) => String(row.id) === String(id));
  return legacy ? mapProductIntroRowToDetail(legacy, mediaBaseUrl()) : null;
}

export async function getAllProductSummariesForRequest(): Promise<ProductSummary[]> {
  if (isProductIntroEnabled()) {
    if (!getCachedProductCategories()) {
      await syncProductIntro({ force: true });
    } else {
      refreshProductIntroInBackground();
    }
    const summaries: ProductSummary[] = [];
    for (const system of PRODUCT_INTRO_SYSTEMS) {
      const rows = getCachedSystemProducts(system.slug);
      for (const row of rows) {
        summaries.push(mapProductIntroRowToProductSummary(row, system.slug, mediaBaseUrl()));
      }
    }
    return summaries.sort((a, b) => {
      const coreDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (coreDiff !== 0) {
        return coreDiff;
      }
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }
  return getFixtures().products;
}
