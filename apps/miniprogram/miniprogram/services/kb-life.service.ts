import type { ImageResource } from '../types/content';
import { getStoredCampusLocation } from '../utils/campus-location';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export interface LifeBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

export interface CampusService {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  path?: string;
}

export interface CanteenMenuItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

export interface ShuttleStop {
  time?: string;
  name: string;
  note?: string;
}

export interface ShuttleRoute {
  id: string;
  name: string;
  stops: ShuttleStop[];
  stationsText: string;
}

interface KbLifeEntriesDto {
  banners: Array<{ id: string; title: string; subtitle: string; image: ImageResource }>;
  locations: string[];
  campusServices: Array<{ id: string; title: string; subtitle: string; icon: ImageResource; path?: string }>;
  employeeServices: Array<{ id: string; title: string; subtitle: string; icon: ImageResource; path?: string }>;
}

interface CanteenDto {
  intro: string;
  menuItems: Array<{ id: string; title: string; description: string; image: ImageResource }>;
}

interface ShuttleDto {
  notice: string;
  routes: ShuttleRoute[];
}

function mapService(
  item: { id: string; title: string; subtitle: string; icon: ImageResource; path?: string },
): CampusService {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    icon: toAssetUrl(item.icon),
    path: item.path,
  };
}

export async function getKbLifeEntries(): Promise<{
  banners: LifeBanner[];
  locations: string[];
  campusServices: CampusService[];
  employeeServices: CampusService[];
}> {
  const data = await get<KbLifeEntriesDto>(API_ENDPOINTS.kbLifeEntries);
  return {
    banners: data.banners.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      image: toAssetUrl(item.image),
    })),
    locations: data.locations,
    campusServices: data.campusServices.map(mapService),
    employeeServices: data.employeeServices.map(mapService),
  };
}

export async function getCanteen(
  location: string = getStoredCampusLocation(),
): Promise<{ intro: string; menuItems: CanteenMenuItem[]; location: string }> {
  const data = await get<CanteenDto & { location?: string }>(API_ENDPOINTS.kbLifeCanteen, { location });
  return {
    intro: data.intro,
    menuItems: data.menuItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      image: toAssetUrl(item.image),
    })),
    location: data.location || location,
  };
}

export async function getShuttle(
  location: string = getStoredCampusLocation(),
): Promise<{ notice: string; routes: ShuttleRoute[]; location: string }> {
  const data = await get<ShuttleDto & { location?: string }>(API_ENDPOINTS.kbLifeShuttle, { location });
  return {
    notice: data.notice,
    routes: data.routes,
    location: data.location || location,
  };
}

export function filterShuttleRoutes(routes: ShuttleRoute[], keyword: string): ShuttleRoute[] {
  const query = keyword.trim().toLowerCase();
  if (!query) {
    return routes;
  }
  return routes.filter((item) => {
    const haystack = `${item.id} ${item.name} ${item.stationsText}`.toLowerCase();
    return haystack.includes(query);
  });
}

export interface WetalkCover {
  id: string;
  title: string;
  date: string;
  image: string;
}

interface WetalkIssueDto {
  id: string;
  title: string;
  date: string;
  coverImage: ImageResource;
  pages: Array<{
    id: string;
    type: 'cover' | 'contents' | 'content';
    title: string;
    coverImage?: ImageResource;
    headlineCn?: string[];
    headlineEn?: string;
    institute?: string;
    brand?: string;
    toc?: Array<{ index: string; titleEn: string; titleCn: string; lines: string[] }>;
    chapterLabel?: string;
    chapterTitle?: string;
    bodyImage?: ImageResource;
    paragraphs?: string[];
    bullets?: string[];
  }>;
}

export async function getWetalkIssues(): Promise<WetalkCover[]> {
  const data = await get<{ items: Array<Omit<WetalkIssueDto, 'pages'>> }>(API_ENDPOINTS.kbLifeWetalk);
  return data.items.map((item) => ({
    id: item.id,
    title: item.title,
    date: item.date,
    image: toAssetUrl(item.coverImage),
  }));
}

/** 映射为 InsightReportView，复用 insight-reader */
export async function getWetalkIssueAsReport(id: string): Promise<{
  id: string;
  title: string;
  titleEn: string;
  caption: string;
  kicker: string;
  english: string;
  image: string;
  gating: boolean;
  pages: Array<{
    id: string;
    type: 'cover' | 'contents' | 'content';
    title: string;
    coverImage?: string;
    headlineCn?: string[];
    headlineEn?: string;
    institute?: string;
    brand?: string;
    toc?: Array<{ index: string; titleEn: string; titleCn: string; lines: string[] }>;
    chapterLabel?: string;
    chapterTitle?: string;
    bodyImage?: string;
    paragraphs?: string[];
    bullets?: string[];
    thumbTone: 'cover' | 'contents' | 'content';
  }>;
}> {
  const data = await get<WetalkIssueDto>(API_ENDPOINTS.kbLifeWetalkDetail(id));
  return {
    id: data.id,
    title: data.title,
    titleEn: data.title,
    caption: data.date,
    kicker: 'WeTalk',
    english: data.date,
    image: toAssetUrl(data.coverImage),
    gating: false,
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

export async function getCampusMap(
  location: string = getStoredCampusLocation(),
): Promise<{ title: string; image: string; location: string }> {
  const data = await get<{ title: string; image: ImageResource; location?: string }>(
    API_ENDPOINTS.kbLifeCampusMap,
    { location },
  );
  return {
    title: data.title,
    image: toAssetUrl(data.image),
    location: data.location || location,
  };
}

export async function getHolidayCalendar(
  location: string = getStoredCampusLocation(),
): Promise<{
  year: number;
  location: string;
  marks: Record<string, { name: string; type: 'holiday' | 'workday' }>;
}> {
  return get(API_ENDPOINTS.kbLifeHolidayCalendar, { location });
}
