import type { ImageResource } from '../types/content';
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

export async function getCanteen(): Promise<{ intro: string; menuItems: CanteenMenuItem[] }> {
  const data = await get<CanteenDto>(API_ENDPOINTS.kbLifeCanteen);
  return {
    intro: data.intro,
    menuItems: data.menuItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      image: toAssetUrl(item.image),
    })),
  };
}

export async function getShuttle(): Promise<{ notice: string; routes: ShuttleRoute[] }> {
  return get<ShuttleDto>(API_ENDPOINTS.kbLifeShuttle);
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
