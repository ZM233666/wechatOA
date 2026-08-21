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
  gating: boolean;
}

export interface InsightTocItem {
  index: string;
  titleEn: string;
  titleCn: string;
  lines: string[];
}

export interface InsightReportPageView {
  id: string;
  type: 'cover' | 'contents' | 'content';
  title: string;
  coverImage?: string;
  headlineCn?: string[];
  headlineEn?: string;
  institute?: string;
  brand?: string;
  toc?: InsightTocItem[];
  chapterLabel?: string;
  chapterTitle?: string;
  bodyImage?: string;
  paragraphs?: string[];
  bullets?: string[];
  thumbTone: 'cover' | 'contents' | 'content';
}

export interface InsightReportView {
  id: string;
  title: string;
  titleEn: string;
  caption: string;
  kicker: string;
  english: string;
  image: string;
  gating: boolean;
  tag?: string;
  pages: InsightReportPageView[];
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
  gating?: boolean;
}

interface InsightReportDto {
  id: string;
  title: string;
  titleEn: string;
  caption: string;
  kicker: string;
  english: string;
  coverImage: ImageResource;
  gating: boolean;
  tag?: string;
  pages: Array<{
    id: string;
    type: 'cover' | 'contents' | 'content';
    title: string;
    coverImage?: ImageResource;
    headlineCn?: string[];
    headlineEn?: string;
    institute?: string;
    brand?: string;
    toc?: InsightTocItem[];
    chapterLabel?: string;
    chapterTitle?: string;
    bodyImage?: ImageResource;
    paragraphs?: string[];
    bullets?: string[];
  }>;
}

interface ServicesPageDto {
  heroCards: ServiceDto[];
  insightCovers: ServiceDto[];
}

function mapInsightCover(item: {
  id: string;
  title: string;
  kicker?: string;
  english?: string;
  caption?: string;
  subtitle?: string;
  coverImage: ImageResource;
  tag?: string;
  gating?: boolean;
}): InsightCover {
  return {
    id: item.id,
    kicker: item.kicker ?? 'KB Insights',
    title: item.title,
    english: item.english ?? item.subtitle ?? item.title,
    caption: item.caption ?? item.title,
    image: toAssetUrl(item.coverImage),
    tag: item.tag,
    gating: Boolean(item.gating),
  };
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
    insightCovers: data.insightCovers.map((item) => mapInsightCover(item)),
  };
}

export async function getInsightReports(): Promise<InsightCover[]> {
  const data = await get<{ items: Array<Omit<InsightReportDto, 'pages'>> }>(
    API_ENDPOINTS.serviceInsights,
  );
  return data.items.map((item) => mapInsightCover(item));
}

export async function getInsightReport(id: string): Promise<InsightReportView> {
  const data = await get<InsightReportDto>(API_ENDPOINTS.serviceInsightDetail(id));
  return {
    id: data.id,
    title: data.title,
    titleEn: data.titleEn,
    caption: data.caption,
    kicker: data.kicker,
    english: data.english,
    image: toAssetUrl(data.coverImage),
    gating: data.gating,
    tag: data.tag,
    pages: data.pages.map((page) => ({
      id: page.id,
      type: page.type,
      title: page.title,
      coverImage: page.coverImage ? toAssetUrl(page.coverImage) : undefined,
      headlineCn: page.headlineCn,
      headlineEn: page.headlineEn,
      institute: page.institute,
      brand: page.brand,
      toc: page.toc,
      chapterLabel: page.chapterLabel,
      chapterTitle: page.chapterTitle,
      bodyImage: page.bodyImage ? toAssetUrl(page.bodyImage) : undefined,
      paragraphs: page.paragraphs,
      bullets: page.bullets,
      thumbTone: page.type,
    })),
  };
}
