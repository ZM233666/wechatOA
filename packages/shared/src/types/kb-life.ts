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

export interface CanteenData {
  intro: string;
  menuItems: CanteenMenuItem[];
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

export interface ShuttleData {
  notice: string;
  routes: ShuttleRoute[];
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

export type WetalkPageType = 'cover' | 'contents' | 'content';

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
}

export interface WetalkIssue extends WetalkIssueSummary {
  pages: WetalkPage[];
}

export interface CampusMapData {
  title: string;
  image: ImageResource;
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
