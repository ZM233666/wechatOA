import { getApiEnvironment } from '../config/env';

/**
 * 将资源路径拼成完整 API path（不含 apiBaseUrl）。
 * develop + mock-server → /api/home
 * trial/release + Django → /api/v1/mini/home
 */
export function buildMiniApiPath(resourcePath: string): string {
  const { miniApiPathPrefix } = getApiEnvironment();
  const prefix = miniApiPathPrefix.replace(/\/+$/, '');
  const resource = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
  return `${prefix}${resource}`;
}
