import type { HomeBanner, HomeData, NewsSummary, QuickEntry } from '../types/home';
import { formatDisplayDate, toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export interface HomeViewData {
  banners: HomeBanner[];
  entries: QuickEntry[];
  newsList: NewsSummary[];
}

export async function getHome(): Promise<HomeViewData> {
  const data = await get<HomeData>(API_ENDPOINTS.home);
  return {
    banners: data.banners.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
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
      image: toAssetUrl(item.coverImage),
      category: item.category.name,
    })),
  };
}
