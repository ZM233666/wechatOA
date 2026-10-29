/** 设计 Token（供 TS 侧提示文案等引用；样式以 WXSS 变量为准） */
export const DESIGN_COLORS = {
  brand: '#00467f',
  navy: '#033e70',
  navyStrong: '#003b70',
  gold: '#d4a84b',
  goldLight: '#e8c56a',
  goldDark: '#b8892e',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  divider: '#EEF0F3',
  danger: '#DC2626',
  success: '#16A34A',
  tabInactive: '#8A94A3',
} as const;

export const DESIGN_SPACING = {
  pagePaddingX: 32,
  cardRadius: 24,
  cardPadding: 28,
} as const;

/** 新闻正文 carousel → swiper interval（毫秒），与 Mock DEFAULT_CAROUSEL_INTERVAL_MS 一致 */
export const CAROUSEL_INTERVAL_DEFAULT_MS = 2000;
export const CAROUSEL_INTERVAL_MIN_MS = 500;
export const CAROUSEL_INTERVAL_MAX_MS = 60_000;

export function normalizeCarouselIntervalMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return CAROUSEL_INTERVAL_DEFAULT_MS;
  }
  const rounded = Math.round(value);
  return Math.min(CAROUSEL_INTERVAL_MAX_MS, Math.max(CAROUSEL_INTERVAL_MIN_MS, rounded));
}
