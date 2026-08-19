import type { ImageResource } from './image';
import type { NewsSummary } from './news';
import type { AppFeatureFlags } from './api';

export interface HomeBanner {
  id: string;
  title: string;
  description: string;
  image: ImageResource;
  targetUrl?: string;
  /** 绑定新闻时，小程序点击进入对应详情 */
  newsId?: string;
}

export interface HomeQuickEntry {
  id: string;
  title: string;
  subtitle: string;
  icon: ImageResource;
  target: string;
  path: string;
}

export interface HomeProductCard {
  id: string;
  name: string;
  nameCn: string;
  summary: string;
  coverImage: ImageResource;
}

export interface HomeCaseCard {
  id: string;
  title: string;
  summary: string;
  coverImage: ImageResource;
}

export interface HomeServiceEntry {
  id: string;
  title: string;
  subtitle: string;
  coverImage: ImageResource;
}

export interface HomeKbLifeSummary {
  title: string;
  subtitle: string;
  entryCount: number;
}

export interface HomeBrandInfo {
  name: string;
  summary: string;
  logo: ImageResource;
}

export interface HomeData {
  banners: HomeBanner[];
  quickEntries: HomeQuickEntry[];
  recommendedProducts: HomeProductCard[];
  recommendedCases: HomeCaseCard[];
  latestNews: NewsSummary[];
  serviceEntries: HomeServiceEntry[];
  kbLifeSummary: HomeKbLifeSummary;
  brandInfo: HomeBrandInfo;
  featureFlags: AppFeatureFlags;
}
