import { getApiBaseUrl } from '../config/env';

export const IMAGE_FALLBACK = '/assets/images/placeholders/placeholder.png';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatDisplayDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** 服务端相对媒体路径。以 / 开头但不是小程序包内资源时，必须拼 API 主机，否则会被当成本地图片。 */
const SERVER_MEDIA_PREFIXES = ['/media/', '/mock-assets/', '/static/'];

function isLocalPackagePath(url: string): boolean {
  return (
    url.startsWith('/assets/') ||
    url.startsWith('/subpackages/') ||
    url.startsWith('/pages/') ||
    url.startsWith('/components/')
  );
}

export function absolutizeMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^(https?:|data:|wxfile:|cloud:)/i.test(trimmed)) {
    return trimmed;
  }
  if (isLocalPackagePath(trimmed)) {
    return trimmed;
  }
  if (SERVER_MEDIA_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    const base = getApiBaseUrl().replace(/\/+$/, '');
    return `${base}${trimmed}`;
  }
  return trimmed;
}

export function toAssetUrl(value: { url: string } | string | undefined): string {
  if (!value) {
    return '';
  }
  const raw = typeof value === 'string' ? value : value.url;
  return absolutizeMediaUrl(raw || '');
}

export function fallbackImageUrl(current: string): string {
  if (!current || current === IMAGE_FALLBACK) {
    return IMAGE_FALLBACK;
  }
  return IMAGE_FALLBACK;
}
