import type { ShuttleData } from '@app/shared';
import { logInfo, logWarn } from '../utils/logger';
import { livePageBudgetMs, raceWithBudget } from './live-api-timeout';
import {
  fetchShuttleRouteDetail,
  fetchShuttleRoutes,
  isShuttleScheduleEnabled,
  needsShuttleRouteDetail,
  type ShuttleScheduleRouteRow,
} from './shuttle-schedule.client';
import { mapShuttleSchedulePayload } from './shuttle-schedule.mapper';

export const SHUTTLE_SCHEDULE_SYNC_TTL_MS = 5 * 60_000;
const SHUTTLE_SCHEDULE_FAILURE_TTL_MS = 30_000;

type CacheEntry = {
  at: number;
  data: ShuttleData | null;
  ok: boolean;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ShuttleData | null>>();

export function campusCodeFromLocation(location: string): string {
  return location.trim().toLowerCase();
}

function cacheTtl(entry: CacheEntry): number {
  return entry.ok ? SHUTTLE_SCHEDULE_SYNC_TTL_MS : SHUTTLE_SCHEDULE_FAILURE_TTL_MS;
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 0 }, () => worker()));
  return results;
}

async function hydrateShuttleRoutes(summaries: ShuttleScheduleRouteRow[]): Promise<ShuttleScheduleRouteRow[]> {
  return mapPool(summaries, 4, async (row) => {
    if (!needsShuttleRouteDetail(row)) {
      return row;
    }
    try {
      return await fetchShuttleRouteDetail(row.id);
    } catch {
      return row;
    }
  });
}

async function fetchLiveShuttle(campus: string, location: string): Promise<ShuttleData> {
  const summaries = await fetchShuttleRoutes(campus);
  const detailed = await hydrateShuttleRoutes(summaries);
  return mapShuttleSchedulePayload(campus, location, detailed);
}

export async function loadLiveShuttle(location: string): Promise<ShuttleData | null> {
  if (!isShuttleScheduleEnabled()) {
    return null;
  }
  const campus = campusCodeFromLocation(location);
  const cached = cache.get(campus);
  if (cached && Date.now() - cached.at < cacheTtl(cached)) {
    return cached.data;
  }
  const pending = inFlight.get(campus);
  if (pending) {
    return cached?.data ?? null;
  }
  const run = (async () => {
    try {
      const data = await fetchLiveShuttle(campus, location);
      cache.set(campus, { at: Date.now(), data, ok: true });
      logInfo('Loaded shuttle schedule from backend', {
        campus,
        routes: data.routes.length,
        mapRoutes: data.map?.routes.length ?? 0,
      });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Shuttle schedule load failed; falling back to fixtures', { location, message });
      const data = cached?.data ?? null;
      cache.set(campus, { at: Date.now(), data, ok: false });
      return data;
    } finally {
      inFlight.delete(campus);
    }
  })();
  inFlight.set(campus, run);
  if (cached) {
    return cached.data;
  }
  return raceWithBudget(run, null, livePageBudgetMs());
}

export function warmupLiveShuttle(location = 'Suzhou'): void {
  void loadLiveShuttle(location);
}
