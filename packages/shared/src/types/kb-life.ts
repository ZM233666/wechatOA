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
