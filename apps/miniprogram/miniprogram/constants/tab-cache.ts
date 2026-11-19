/** 与 persisted-swr / 各 Tab 数据服务共用的缓存时长 */
export const TAB_CACHE_FRESH_MS = 30_000;
export const TAB_CACHE_STALE_MS = 5 * 60_000;
export const TAB_CACHE_MAX_AGE_MS = TAB_CACHE_FRESH_MS + TAB_CACHE_STALE_MS;

export const TAB_CACHE_KEYS = {
  home: 'home',
  services: (identityRevision: number) => `services:${identityRevision}`,
  kbLifeEntries: (location: string) => `kb-life:entries:v6:${location}`,
  kbLifeWetalkFeatured: 'kb-life:wetalk:featured:v1',
} as const;