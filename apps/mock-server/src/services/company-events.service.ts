import type { ActivitiesData } from '@app/shared';
import { logWarn } from '../utils/logger';
import { liveApiTimeoutMs, raceWithBudget } from './live-api-timeout';
import {
  fetchAnnualDinner,
  fetchHealthCheckup,
  fetchOutingActivities,
  isCompanyEventsEnabled,
} from './company-events.client';
import {
  mapAnnualDinner,
  mapHealthCheckup,
  mapOutingActivities,
  OUTINGS_PAGE_META,
} from './company-events.mapper';
import { getFixtures } from './fixture.service';

export const COMPANY_EVENTS_SYNC_TTL_MS = 5 * 60_000;
const COMPANY_EVENTS_FAILURE_TTL_MS = 30_000;

export type LiveActivitiesData = ActivitiesData & { live: true };

type CacheEntry = {
  at: number;
  data: LiveActivitiesData | null;
  ok: boolean;
};

let cache: CacheEntry | null = null;
let inFlight: Promise<LiveActivitiesData | null> | null = null;

function navigationItems(): ActivitiesData['items'] {
  return getFixtures().activities.items;
}

function emptyLiveActivities(): LiveActivitiesData {
  return {
    live: true,
    items: navigationItems(),
    outingsMeta: OUTINGS_PAGE_META,
    annualDinner: null,
    outings: [],
    health: null,
  };
}

async function fetchLiveActivities(): Promise<LiveActivitiesData> {
  const [annualRow, outingRows, healthRow] = await Promise.all([
    fetchAnnualDinner(),
    fetchOutingActivities(),
    fetchHealthCheckup(),
  ]);
  return {
    live: true,
    items: navigationItems(),
    outingsMeta: OUTINGS_PAGE_META,
    annualDinner: mapAnnualDinner(annualRow),
    outings: mapOutingActivities(outingRows),
    health: mapHealthCheckup(healthRow),
  };
}

export async function loadLiveActivities(): Promise<LiveActivitiesData | null> {
  if (!isCompanyEventsEnabled()) {
    return null;
  }
  const now = Date.now();
  if (cache && now - cache.at < (cache.ok ? COMPANY_EVENTS_SYNC_TTL_MS : COMPANY_EVENTS_FAILURE_TTL_MS)) {
    return cache.data;
  }
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    try {
      const data = await raceWithBudget(
        fetchLiveActivities(),
        emptyLiveActivities(),
        Math.min(liveApiTimeoutMs() * 3, 12_000),
      );
      cache = { at: Date.now(), data, ok: true };
      return data;
    } catch (error) {
      logWarn('Company events live load failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      cache = { at: Date.now(), data: cache?.ok ? cache.data : null, ok: false };
      return cache.data;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function activitiesResponseWithoutFakeData(): LiveActivitiesData {
  return emptyLiveActivities();
}
