import {
  TAB_CACHE_FRESH_MS,
  TAB_CACHE_KEYS,
  TAB_CACHE_MAX_AGE_MS,
  TAB_CACHE_STALE_MS,
} from '../constants/tab-cache';
import type { HomeBanner, HomeData, NewsSummary, QuickEntry } from '../types/home';
import { firstNewsCover, formatDisplayDate, toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { readPersistedSnapshot, withPersistedStaleWhileRevalidate } from './persisted-swr';
import { get } from './request';

export interface HomeViewData {
  newsStatus: HomeData['newsStatus'] | null;
  banners: HomeBanner[];
  entries: QuickEntry[];
  newsList: NewsSummary[];
}

export function readPersistedHomeView(): HomeViewData | null {
  return readPersistedSnapshot<HomeViewData>(TAB_CACHE_KEYS.home, TAB_CACHE_MAX_AGE_MS);
}

export async function getHome(): Promise<HomeViewData> {
  return withPersistedStaleWhileRevalidate(TAB_CACHE_KEYS.home, TAB_CACHE_FRESH_MS, TAB_CACHE_STALE_MS, async () => {
    const data = await get<HomeData>(API_ENDPOINTS.home);
    return {
      newsStatus: data.newsStatus ?? null,
      banners: data.banners.map((item) => ({
        id: item.id,
        title: item.title,
        ...(item.description ? { description: item.description } : {}),
        image: toAssetUrl(item.image),
        newsId: item.newsId,
        targetUrl: item.targetUrl,
      })),
      entries: data.quickEntries.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        icon: toAssetUrl(item.icon),
        target: item.target,
      })),
      newsList: data.latestNews.map((item) => ({
        id: item.id,
        title: item.title,
        date: formatDisplayDate(item.publishedAt),
        image: firstNewsCover(item.coverImage),
        category: item.category.name,
      })),
    };
  });
}
