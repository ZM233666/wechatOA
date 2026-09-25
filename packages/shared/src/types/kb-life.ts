import type { ImageResource } from './image';

export interface KbLifeBanner {
  id: string;
  title: string;
  subtitle: string;
  image: ImageResource;
}

export interface KbLifeServiceEntry {
  id: string;
  title: string;
  subtitle: string;
  icon: ImageResource;
  path?: string;
}

export interface KbLifeEntriesData {
  banners: KbLifeBanner[];
  locations: string[];
  campusServices: KbLifeServiceEntry[];
  employeeServices: KbLifeServiceEntry[];
}

export interface CanteenMenuItem {
  id: string;
  title: string;
  description: string;
  image: ImageResource;
}

export interface CanteenSection {
  id: string;
  title: string;
  text: string;
  images: ImageResource[];
}

export interface CanteenData {
  intro: string;
  menuItems: CanteenMenuItem[];
  /** 来自 lunch_menu 已发布快照时为 true，小程序按 sections 展示 */
  live?: boolean;
  title?: string;
  menuDate?: string;
  coverImage?: ImageResource;
  sections?: CanteenSection[];
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

export interface ShuttleMapPoint {
  latitude: number;
  longitude: number;
}

export interface ShuttleMapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  sequence: number;
  timesText: string;
}

export interface ShuttleMapRouteLine {
  id: string;
  name: string;
  color: string;
  points: ShuttleMapPoint[];
  markers: ShuttleMapMarker[];
}

/** 班车线路图（站点经纬度 + 折线，非 PDF） */
export interface ShuttleMapData {
  title: string;
  center: ShuttleMapPoint;
  routes: ShuttleMapRouteLine[];
}

export interface ShuttleData {
  notice: string;
  routes: ShuttleRoute[];
  /** 班车线路图（通常由 PDF 渲页生成，苏州等园区） */
  map?: ShuttleMapData;
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
  /** 该站各线路班车时刻，如 7:37 / 8:00 */
  timesText: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  shuttleLineNames: string[];
  plans: ShuttleTripLegPlan[];
}

export interface ShuttleTripPlanData {
  destination: {
    name: string;
    latitude: number;
    longitude: number;
  };
  nearbyStops: ShuttleTripNearbyStop[];
}

export interface KbLifeActivity {
  id: string;
  title: string;
  subtitle: string;
  icon: ImageResource;
  iconBg: string;
  path: string;
}

export interface OutingActivity {
  id: string;
  title: string;
  descriptionCn: string;
  descriptionEn: string;
  timeLabel: string;
  status: 'open' | 'closed';
  statusText: string;
}

export interface ActivitiesData {
  items: KbLifeActivity[];
  annualDinner: {
    title: string;
    subtitle: string;
    time: string;
    location: string;
  };
  outings: OutingActivity[];
  health: {
    title: string;
    description: string;
  };
}

export type WetalkPageType = 'cover' | 'contents' | 'content' | 'sheet';

export interface WetalkTocItem {
  index: string;
  titleEn: string;
  titleCn: string;
  lines: string[];
}

export interface WetalkPage {
  id: string;
  type: WetalkPageType;
  title: string;
  coverImage?: ImageResource;
  headlineCn?: string[];
  headlineEn?: string;
  institute?: string;
  brand?: string;
  toc?: WetalkTocItem[];
  chapterLabel?: string;
  chapterTitle?: string;
  bodyImage?: ImageResource;
  paragraphs?: string[];
  bullets?: string[];
}

export interface WetalkIssueSummary {
  id: string;
  title: string;
  date: string;
  coverImage: ImageResource;
  /**
   * PDF 源文件访问路径（相对 `/mock-assets/...`，经 mock 层转为绝对 URL）。
   * 阅读统一走小程序内翻页阅读器；`pdfUrl` 可用于下载等辅助能力。
   */
  pdfUrl?: string;
}

export interface WetalkIssue extends WetalkIssueSummary {
  /** 翻页阅读器内容；可由 JSON pages 或 PDF 渲出的 sheet 页组成 */
  pages: WetalkPage[];
}

export interface CampusMapPage {
  id: string;
  type: 'sheet';
  title: string;
  coverImage: ImageResource;
}

export interface CampusMapData {
  title: string;
  image: ImageResource;
  /** PDF 源访问路径；有 PDF 时前端走页内翻页阅读器 */
  pdfUrl?: string;
  pages?: CampusMapPage[];
}

export interface HolidayMarkData {
  name: string;
  type: 'holiday' | 'workday';
}

export interface HolidayCalendarData {
  year: number;
  location: string;
  marks: Record<string, HolidayMarkData>;
}

export type CampusLocationResources = {
  canteen: CanteenData;
  shuttle: ShuttleData;
  campusMap: CampusMapData;
  holiday: HolidayCalendarData;
};
