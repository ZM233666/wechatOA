import type { ImageResource } from '../types/content';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export interface ServiceHeroCard {
  id: string;
  title: string;
  subtitle: string;
  footerTitle: string;
  footerHint: string;
  image: string;
  icon: string;
  iconTone: 'blue' | 'gold';
  showOnline?: boolean;
}

export interface InsightCover {
  id: string;
  kicker: string;
  title: string;
  english: string;
  caption: string;
  image: string;
  tag?: string;
}

interface ServiceDto {
  id: string;
  title: string;
  subtitle: string;
  footerTitle: string;
  footerHint: string;
  coverImage: ImageResource;
  icon: ImageResource;
  iconTone: 'blue' | 'gold';
  showOnline: boolean;
  kicker?: string;
  english?: string;
  caption?: string;
  tag?: string;
}

interface ServicesPageDto {
  heroCards: ServiceDto[];
  insightCovers: ServiceDto[];
}

export async function getServices(): Promise<{
  heroCards: ServiceHeroCard[];
  insightCovers: InsightCover[];
}> {
  const data = await get<ServicesPageDto>(API_ENDPOINTS.services);
  return {
    heroCards: data.heroCards.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      footerTitle: item.footerTitle,
      footerHint: item.footerHint,
      image: toAssetUrl(item.coverImage),
      icon: toAssetUrl(item.icon),
      iconTone: item.iconTone,
      showOnline: item.showOnline,
    })),
    insightCovers: data.insightCovers.map((item) => ({
      id: item.id,
      kicker: item.kicker ?? 'KB Insights',
      title: item.title,
      english: item.english ?? item.subtitle,
      caption: item.caption ?? item.title,
      image: toAssetUrl(item.coverImage),
      tag: item.tag,
    })),
  };
}
