import type { Request } from 'express';
import { mockEnv } from '../config/env';

const ASSET_KEYS = new Set(['url', 'imageUrl']);

function joinBase(baseUrl: string, assetPath: string): string {
  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }
  return `${baseUrl}${assetPath}`;
}

export function resolvePublicBaseUrl(req: Request): string {
  if (mockEnv.MOCK_PUBLIC_BASE_URL) {
    return mockEnv.MOCK_PUBLIC_BASE_URL;
  }
  const host = req.get('host') ?? `127.0.0.1:${mockEnv.MOCK_PORT}`;
  return `${req.protocol}://${host}`;
}

export function rewriteAssetUrls<T>(value: T, baseUrl: string): T {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteAssetUrls(item, baseUrl)) as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (ASSET_KEYS.has(key) && typeof nested === 'string' && nested.startsWith('/mock-assets/')) {
        return [key, joinBase(baseUrl, nested)];
      }
      return [key, rewriteAssetUrls(nested, baseUrl)];
    });
    return Object.fromEntries(entries) as T;
  }
  return value;
}

export function withAbsoluteAssets<T>(req: Request, data: T): T {
  return rewriteAssetUrls(data, resolvePublicBaseUrl(req));
}
