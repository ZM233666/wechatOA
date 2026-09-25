import type { ImageResource } from '../types/content';
import { getStoredCampusLocation } from '../utils/campus-location';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';
import type { InsightReportView } from './services.service';

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

export interface CanteenSection {
  id: string;
  title: string;
  text: string;
  images: string[];
}

export interface ShuttleMapRouteLine {
  id: string;
  name: string;
  color: string;
  points: Array<{ latitude: number; longitude: number }>;
  markers: Array<{
    id: number;
    latitude: number;
    longitude: number;
    title: string;
    sequence: number;
    timesText: string;
  }>;
}

export interface ShuttleMapPayload {
  title: string;
  center: { latitude: number; longitude: number };
  routes: ShuttleMapRouteLine[];
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
  /** 搜索用拼接文案 */
  stationsText: string;
  /** 展示用：每站一行，「时间;地点」 */
  stopLines: string[];
}

interface KbLifeEntriesDto {
  banners: Array<{ id: string; title: string; subtitle: string; image: ImageResource }>;
  locations: string[];
  campusServices: Array<{ id: string; title: string; subtitle: string; icon: ImageResource; path?: string }>;
  employeeServices: Array<{ id: string; title: string; subtitle: string; icon: ImageResource; path?: string }>;
}

interface CanteenDto {
  intro: string;
  live?: boolean;
  title?: string;
  menuDate?: string;
  coverImage?: ImageResource;
  menuItems: Array<{ id: string; title: string; description: string; image: ImageResource }>;
  sections?: Array<{
    id: string;
    title: string;
    text: string;
    images: ImageResource[];
  }>;
}

interface ShuttleDto {
  notice: string;
  routes: Array<{
    id: string;
    name: string;
    stops: ShuttleStop[];
    stationsText?: string;
  }>;
  map?: {
    title: string;
    center: { latitude: number; longitude: number };
    routes: Array<{
      id: string;
      name: string;
      color: string;
      points: Array<{ latitude: number; longitude: number }>;
      markers: Array<{
        id: number;
        latitude: number;
        longitude: number;
        title: string;
        sequence: number;
        timesText: string;
      }>;
    }>;
  };
}

/** 班车站点展示：时间与地点用空格分隔；无时间则只显示地点 */
export function formatShuttleStopLine(stop: ShuttleStop): string {
  const place = stop.note ? `${stop.name}（${stop.note}）` : stop.name;
  if (stop.time) {
    return `${stop.time} ${place}`;
  }
  return place;
}

function mapShuttleRoute(item: ShuttleDto['routes'][number]): ShuttleRoute {
  const stopLines = item.stops.map(formatShuttleStopLine);
  return {
    id: item.id,
    name: item.name,
    stops: item.stops,
    stopLines,
    stationsText: stopLines.join('\n'),
  };
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
): Promise<{
  intro: string;
  menuItems: CanteenMenuItem[];
  sections: CanteenSection[];
  live: boolean;
  title: string;
  menuDate: string;
  coverImage: string;
  location: string;
}> {
  const data = await get<CanteenDto & { location?: string }>(API_ENDPOINTS.kbLifeCanteen, { location });
  return {
    intro: data.intro,
    live: Boolean(data.live),
    title: data.title || '',
    menuDate: data.menuDate || '',
    coverImage: data.coverImage ? toAssetUrl(data.coverImage) : '',
    menuItems: data.menuItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      image: toAssetUrl(item.image),
    })),
    sections: (data.sections ?? []).map((section) => ({
      id: section.id,
      title: section.title,
      text: section.text,
      images: section.images.map((image) => toAssetUrl(image)),
    })),
    location: data.location || location,
  };
}

export async function getShuttle(
  location: string = getStoredCampusLocation(),
): Promise<{
  notice: string;
  routes: ShuttleRoute[];
  location: string;
  map?: ShuttleMapPayload;
}> {
  const data = await get<ShuttleDto & { location?: string }>(API_ENDPOINTS.kbLifeShuttle, { location });
  const resolvedLocation = data.location || location;
  const map = data.map
    ? {
        title: data.map.title,
        center: data.map.center,
        routes: data.map.routes ?? [],
      }
    : undefined;
  return {
    notice: data.notice,
    routes: data.routes.map(mapShuttleRoute),
    location: resolvedLocation,
    map,
  };
}

export type ShuttleTripMode = 'transit' | 'bicycling' | 'walking';

export interface ShuttleTripLegPlan {
  mode: ShuttleTripMode;
  modeLabel: string;
  durationMinutes: number;
  distanceMeters: number;
  summary: string;
}

export interface ShuttleTripNearbyStop {
  stopId: number;
  stopName: string;
  timesText: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  shuttleLineNames: string[];
  plans: ShuttleTripLegPlan[];
  distanceText?: string;
  shuttleLinesText?: string;
  stopTitle?: string;
}

export interface ShuttleTripPlanResult {
  location: string;
  destination: {
    name: string;
    latitude: number;
    longitude: number;
  };
  nearbyStops: ShuttleTripNearbyStop[];
}

function formatTripDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export async function planShuttleTrip(
  destination: string,
  location: string = getStoredCampusLocation(),
  coords?: { latitude: number; longitude: number; name?: string },
): Promise<ShuttleTripPlanResult> {
  const params: Record<string, string | number> = { location, destination };
  if (coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
    params.latitude = coords.latitude;
    params.longitude = coords.longitude;
    if (coords.name) {
      params.name = coords.name;
    }
  }
  const data = await get<ShuttleTripPlanResult>(API_ENDPOINTS.kbLifeShuttleTripPlan, params);
  return {
    ...data,
    nearbyStops: data.nearbyStops.map((stop) => ({
      ...stop,
      timesText: stop.timesText || '',
      distanceText: formatTripDistance(stop.distanceMeters),
      shuttleLinesText: stop.shuttleLineNames.join(' · '),
      stopTitle: stop.timesText ? `${stop.stopName} · ${stop.timesText}` : stop.stopName,
    })),
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
  pdfUrl?: string;
  pages: Array<{
    id: string;
    type: 'cover' | 'contents' | 'content' | 'sheet';
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

/** 映射为 InsightReportView，复用 insight-reader（含 PDF→sheet） */
export async function getWetalkIssueAsReport(id: string): Promise<InsightReportView> {
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
    pdfUrl: data.pdfUrl,
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
): Promise<{
  title: string;
  image: string;
  location: string;
  pdfUrl?: string;
  pages: InsightReportView['pages'];
}> {
  const data = await get<{
    title: string;
    image: ImageResource;
    location?: string;
    pdfUrl?: string;
    pages?: Array<{
      id: string;
      type: 'sheet';
      title: string;
      coverImage?: ImageResource;
    }>;
  }>(API_ENDPOINTS.kbLifeCampusMap, { location });
  return {
    title: data.title,
    image: toAssetUrl(data.image),
    location: data.location || location,
    pdfUrl: data.pdfUrl,
    pages: (data.pages ?? []).map((page) => ({
      id: page.id,
      type: page.type,
      title: page.title,
      coverImage: page.coverImage ? toAssetUrl(page.coverImage) : undefined,
      thumbTone: page.type,
    })),
  };
}

/** 映射为 InsightReportView，复用 insight-reader 阅读园区地图 PDF */
export async function getCampusMapAsReport(location: string): Promise<InsightReportView> {
  const data = await getCampusMap(location);
  return {
    id: data.location,
    title: data.title,
    titleEn: data.title,
    caption: data.location,
    kicker: 'Campus Map',
    english: data.location,
    image: data.image,
    gating: false,
    pdfUrl: data.pdfUrl,
    pages: data.pages,
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
