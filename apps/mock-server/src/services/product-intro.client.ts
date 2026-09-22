import { mockEnv } from '../config/env';
import { logInfo, logWarn } from '../utils/logger';

export type ProductIntroDetailItem = {
  id?: string;
  title?: string;
  content?: string;
};

export type ProductIntroRow = {
  id: number | string;
  product_name?: string;
  category?: string;
  product_no?: string;
  summary?: string;
  detail_items?: ProductIntroDetailItem[];
  cover_url?: string;
  is_core_product?: boolean;
  is_top?: boolean;
  publish_time?: string | null;
  update_datetime?: string;
  status?: string;
};

export type ProductIntroSystemSlug = 'braking' | 'door' | 'power-supply';

export const PRODUCT_INTRO_SYSTEMS: Array<{
  slug: ProductIntroSystemSlug;
  legacyIds: string[];
  name: string;
  nameCn: string;
  subtitleEn: string;
  description: string;
}> = [
  {
    slug: 'braking',
    legacyIds: ['braking', 'product-001'],
    name: 'Braking Systems',
    nameCn: '制动系统',
    subtitleEn: 'Braking',
    description:
      'Intelligent, highly integrated braking technologies for all types of rail vehicles.',
  },
  {
    slug: 'door',
    legacyIds: ['door', 'product-002'],
    name: 'Door Systems (IFE)',
    nameCn: '门系统',
    subtitleEn: 'Door',
    description: 'Reliable, smart entrance systems for smooth passenger flow.',
  },
  {
    slug: 'power-supply',
    legacyIds: ['power-supply', 'power', 'product-003'],
    name: 'Power Supply Systems (Microelettrica)',
    nameCn: '电源系统',
    subtitleEn: 'Power Supply',
    description:
      'Advanced power components and control solutions for reliable rail vehicle energy management.',
  },
];

type ListEnvelope = {
  code: number;
  msg?: string;
  data?: ProductIntroRow[] | null;
};

type DetailEnvelope = {
  code: number;
  msg?: string;
  data?: ProductIntroRow | null;
};

type LoginData = {
  access: string;
};

type TokenState = {
  access: string;
  fetchedAtMs: number;
};

export const PRODUCT_INTRO_SYNC_TTL_MS = 30_000;

let tokenState: TokenState | null = null;

export function isProductIntroEnabled(): boolean {
  return mockEnv.PRODUCT_INTRO_ENABLED && mockEnv.NODE_ENV !== 'test';
}

export function resolveProductIntroSystemSlug(idOrSlug: string): ProductIntroSystemSlug | null {
  const value = idOrSlug.trim().toLowerCase();
  for (const system of PRODUCT_INTRO_SYSTEMS) {
    if (system.slug === value || system.legacyIds.includes(value)) {
      return system.slug;
    }
  }
  return null;
}

export function matchesProductCategoryFilter(
  itemCategoryId: string,
  filterCategory: string,
): boolean {
  const itemSlug = resolveProductIntroSystemSlug(itemCategoryId) ?? itemCategoryId;
  const filterSlug = resolveProductIntroSystemSlug(filterCategory) ?? filterCategory;
  return itemSlug === filterSlug;
}

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function normalizeProductIntroRow(row: ProductIntroRow): ProductIntroRow {
  return {
    ...row,
    is_top: toBool(row.is_top),
    is_core_product: toBool(row.is_core_product),
  };
}

function normalizeProductIntroRows(rows: ProductIntroRow[]): ProductIntroRow[] {
  return rows.map(normalizeProductIntroRow);
}

function apiBase(): string {
  return mockEnv.PRODUCT_INTRO_API_BASE_URL.replace(/\/+$/, '');
}

async function requestJson<T>(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Product Intro API 非 JSON 响应 (${response.status}): ${text.slice(0, 200)}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginAdminApi(force = false): Promise<string> {
  if (!force && tokenState && Date.now() - tokenState.fetchedAtMs < 50 * 60_000) {
    return tokenState.access;
  }
  const payload = await requestJson<{ code: number; msg?: string; data?: LoginData }>(
    '/api/token/',
    {
      method: 'POST',
      body: {
        username: mockEnv.PRODUCT_INTRO_USERNAME,
        password: mockEnv.PRODUCT_INTRO_PASSWORD,
      },
      timeoutMs: 20_000,
    },
  );
  const access = payload.data?.access;
  if (payload.code !== 2000 || !access) {
    throw new Error(`Product Intro 登录失败: ${payload.msg ?? JSON.stringify(payload)}`);
  }
  tokenState = { access, fetchedAtMs: Date.now() };
  logInfo('Product Intro admin API login ok', { base: apiBase(), user: mockEnv.PRODUCT_INTRO_USERNAME });
  return access;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await loginAdminApi();
  try {
    return await requestJson<T>(path, {
      headers: { Authorization: `JWT ${token}` },
    });
  } catch {
    await loginAdminApi(true);
    const retryToken = await loginAdminApi();
    return requestJson<T>(path, {
      headers: { Authorization: `JWT ${retryToken}` },
    });
  }
}

function sortProducts(rows: ProductIntroRow[]): ProductIntroRow[] {
  return [...rows].sort((a, b) => {
    const topDiff = Number(Boolean(b.is_top)) - Number(Boolean(a.is_top));
    if (topDiff !== 0) {
      return topDiff;
    }
    const coreDiff = Number(Boolean(b.is_core_product)) - Number(Boolean(a.is_core_product));
    if (coreDiff !== 0) {
      return coreDiff;
    }
    const aTime = Date.parse(String(a.update_datetime ?? a.publish_time ?? '')) || 0;
    const bTime = Date.parse(String(b.update_datetime ?? b.publish_time ?? '')) || 0;
    return bTime - aTime;
  });
}

async function fetchProductListPublic(system: ProductIntroSystemSlug): Promise<ProductIntroRow[]> {
  const envelope = await requestJson<ListEnvelope>(
    `/api/product-intro/public/${system}/products/?page=1&limit=100`,
  );
  if (envelope.code !== 2000) {
    throw new Error(`Product Intro 公开列表失败 (${system}): ${envelope.msg ?? envelope.code}`);
  }
  return Array.isArray(envelope.data) ? envelope.data : [];
}

async function fetchProductListAdmin(system: ProductIntroSystemSlug): Promise<ProductIntroRow[]> {
  const params = new URLSearchParams({
    status: 'published',
    page: '1',
    limit: '100',
    ordering: '-is_top,-update_datetime',
  });
  const envelope = await authedGet<ListEnvelope>(
    `/api/product-intro/${system}/products/?${params}`,
  );
  if (envelope.code !== 2000) {
    throw new Error(`Product Intro 管理端列表失败 (${system}): ${envelope.msg ?? envelope.code}`);
  }
  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  return sortProducts(rows.filter((item) => item.status === 'published').map(normalizeProductIntroRow));
}

export async function fetchProductIntroList(system: ProductIntroSystemSlug): Promise<ProductIntroRow[]> {
  if (mockEnv.PRODUCT_INTRO_TRY_PUBLIC) {
    try {
      const rows = await fetchProductListPublic(system);
      logInfo('Product intro list loaded from public API', { system, count: rows.length });
      return sortProducts(normalizeProductIntroRows(rows));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Product intro public list unavailable; falling back to admin API', { system, message });
    }
  }
  const rows = await fetchProductListAdmin(system);
  if (rows.length) {
    logInfo('Product intro list loaded from admin API', { system, count: rows.length });
  }
  return rows;
}

export async function fetchProductIntroDetail(
  system: ProductIntroSystemSlug,
  productId: string | number,
): Promise<ProductIntroRow | null> {
  if (mockEnv.PRODUCT_INTRO_TRY_PUBLIC) {
    try {
      const envelope = await requestJson<DetailEnvelope>(
        `/api/product-intro/public/${system}/products/${productId}/`,
      );
      if (envelope.code === 2000 && envelope.data) {
        logInfo('Product intro detail loaded from public API', { system, id: productId });
        return normalizeProductIntroRow(envelope.data);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Product intro public detail unavailable; falling back to admin API', {
        system,
        id: productId,
        message,
      });
    }
  }
  const envelope = await authedGet<DetailEnvelope>(
    `/api/product-intro/${system}/products/${productId}/`,
  );
  if (envelope.code !== 2000 || !envelope.data) {
    throw new Error(`Product Intro 详情失败 (${system}/${productId}): ${envelope.msg ?? envelope.code}`);
  }
  logInfo('Product intro detail loaded from admin API', { system, id: productId });
  return normalizeProductIntroRow(envelope.data);
}
