/** 与 persisted-swr / 各 Tab 数据服务共用的缓存时长 */
export const TAB_CACHE_FRESH_MS = 30_000;
export const TAB_CACHE_STALE_MS = 5 * 60_000;
export const TAB_CACHE_MAX_AGE_MS = TAB_CACHE_FRESH_MS + TAB_CACHE_STALE_MS;

export const TAB_CACHE_KEYS = {
  /** v2：首页 latestNews 上限 4 条（失效旧版 3 条持久化快照） */
  home: 'home:v2',
  services: (identityRevision: number) => `services:${identityRevision}`,
  kbLifeEntries: (location: string) => `kb-life:entries:v7:${location}`,
  kbLifeWetalkFeatured: 'kb-life:wetalk:featured:v1',
} as const;