import type { ImageResource } from '@app/shared';
import { logInfo, logWarn } from '../utils/logger';
import { livePageBudgetMs, raceWithBudget } from './live-api-timeout';
import {
  fetchLunchMenuByDate,
  fetchPublishedLunchMenus,
  isLunchMenuEnabled,
  type LunchMenuRow,
} from './lunch-menu.client';
import { resolveLunchMenuImage } from './lunch-menu.media';
import { isPublishedLunchMenu, mapLunchMenuRow, type MappedLunchMenu } from './lunch-menu.mapper';

export const LUNCH_MENU_SYNC_TTL_MS = 5 * 60_000;
const LUNCH_MENU_FAILURE_TTL_MS = 30_000;
/** 空菜单或未发布时短缓存，避免发布后长时间仍显示「暂无已发布」 */
const LUNCH_MENU_EMPTY_TTL_MS = 15_000;

export type LiveCanteenMenu = {
  live: true;
  title: string;
  menuDate: string;
  coverImage?: ImageResource;
  sections: Array<{
    id: string;
    title: string;
    text: string;
    images: ImageResource[];
  }>;
};

type CacheEntry = {
  at: number;
  menu: LiveCanteenMenu | null;
  ok: boolean;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<LiveCanteenMenu | null>>();

export function shanghaiMenuDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function campusCodeFromLocation(location: string): string {
  return location.trim().toLowerCase();
}

function toImage(url: string, alt: string): ImageResource {
  return {
    url,
    alt,
    width: 800,
    height: 600,
    aspectRatio: 1.3333,
  };
}

function cacheTtl(entry: CacheEntry): number {
  if (!entry.ok) {
    return LUNCH_MENU_FAILURE_TTL_MS;
  }
  if (!entry.menu?.sections.length) {
    return LUNCH_MENU_EMPTY_TTL_MS;
  }
  return LUNCH_MENU_SYNC_TTL_MS;
}

function hydrateMenu(menu: MappedLunchMenu): LiveCanteenMenu {
  const coverUrl = menu.coverUrl ? resolveLunchMenuImage(menu.coverUrl) : '';
  const sections = menu.sections.map((section) => ({
    id: section.id,
    title: section.title,
    text: section.text,
    images: section.imageUrls
      .map((imageUrl) => resolveLunchMenuImage(imageUrl))
      .filter(Boolean)
      .map((url) => toImage(url, section.title)),
  }));
  return {
    live: true,
    title: menu.title,
    menuDate: menu.menuDate,
    coverImage: coverUrl ? toImage(coverUrl, menu.title) : undefined,
    sections,
  };
}

function rowForToday(rows: LunchMenuRow[], today: string): LunchMenuRow | null {
  return rows.find((row) => (row.menu_date || '').trim() === today && isPublishedLunchMenu(row)) ?? null;
}

async function resolvePublishedMenu(campus: string, today: string): Promise<MappedLunchMenu | null> {
  const byDate = await fetchLunchMenuByDate(campus, today);
  if (byDate && isPublishedLunchMenu(byDate)) {
    const mapped = mapLunchMenuRow(byDate);
    if (mapped?.sections.length) {
      return mapped;
    }
  }
  const published = await fetchPublishedLunchMenus(campus);
  const todayRow = rowForToday(published, today);
  if (todayRow) {
    return mapLunchMenuRow(todayRow);
  }
  if (byDate && isPublishedLunchMenu(byDate)) {
    return mapLunchMenuRow(byDate);
  }
  return null;
}

async function fetchLiveCanteen(campus: string, today: string): Promise<LiveCanteenMenu> {
  const mapped = await resolvePublishedMenu(campus, today);
  const menu: LiveCanteenMenu = mapped
    ? hydrateMenu(mapped)
    : {
        live: true,
        title: '今日午餐',
        menuDate: today,
        sections: [],
      };
  cache.set(`${campus}:${today}`, { at: Date.now(), menu, ok: true });
  logInfo('Loaded lunch menu', {
    campus,
    menuDate: menu.menuDate,
    sections: menu.sections.length,
  });
  return menu;
}

export async function loadLiveCanteen(location: string): Promise<LiveCanteenMenu | null> {
  if (!isLunchMenuEnabled()) {
    return null;
  }
  const campus = campusCodeFromLocation(location);
  const today = shanghaiMenuDate();
  const cacheKey = `${campus}:${today}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < cacheTtl(cached)) {
    return cached.menu;
  }
  const pending = inFlight.get(cacheKey);
  if (pending) {
    return cached?.menu ?? null;
  }
  const run = (async () => {
    try {
      return await fetchLiveCanteen(campus, today);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Lunch menu load failed; falling back to fixtures', { location, message });
      const menu = cached?.menu ?? null;
      cache.set(cacheKey, { at: Date.now(), menu, ok: false });
      return menu;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();
  inFlight.set(cacheKey, run);
  if (cached) {
    return cached.menu;
  }
  return raceWithBudget(run, null, livePageBudgetMs());
}

export function warmupLiveCanteen(location = 'Suzhou'): void {
  void loadLiveCanteen(location);
}
