import type { OpenPositionDetail, OpenPositionSummary, OpenPositionsListData } from '@app/shared';
import { logInfo, logWarn } from '../utils/logger';
import { livePageBudgetMs, raceWithBudget } from './live-api-timeout';
import {
  fetchJobOpeningDetail,
  fetchPublishedJobOpenings,
  isJobOpeningsEnabled,
} from './job-openings.client';
import {
  mapJobOpeningDetail,
  mapJobOpeningSummary,
  parseJobBackendId,
} from './job-openings.mapper';
import { getFixtures } from './fixture.service';

export const JOB_OPENINGS_SYNC_TTL_MS = 5 * 60_000;
const JOB_OPENINGS_FAILURE_TTL_MS = 30_000;

type CacheEntry = {
  at: number;
  items: OpenPositionSummary[];
  ok: boolean;
};

let listCache: CacheEntry | null = null;
let listInFlight: Promise<OpenPositionSummary[]> | null = null;
const detailCache = new Map<string, { at: number; detail: OpenPositionDetail }>();

function fixtureList(): OpenPositionSummary[] {
  return getFixtures().openPositions.items.map(({ description: _d, requirements: _r, ...summary }) => summary);
}

function fixtureDetail(publicId: string): OpenPositionDetail | null {
  return getFixtures().openPositions.items.find((item) => item.id === publicId) ?? null;
}

async function fetchLiveList(): Promise<OpenPositionSummary[]> {
  const rows = await fetchPublishedJobOpenings();
  const items = rows.map(mapJobOpeningSummary);
  listCache = { at: Date.now(), items, ok: true };
  logInfo('Loaded job openings from management API', { count: items.length });
  return items;
}

export async function loadOpenPositionsList(): Promise<OpenPositionsListData> {
  if (!isJobOpeningsEnabled()) {
    return { items: fixtureList() };
  }
  if (listCache && Date.now() - listCache.at < JOB_OPENINGS_SYNC_TTL_MS) {
    return { items: listCache.items };
  }
  if (listInFlight) {
    const items = await raceWithBudget(listInFlight, fixtureList(), livePageBudgetMs());
    return { items };
  }
  listInFlight = (async () => {
    try {
      return await fetchLiveList();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Job openings list load failed', { message });
      listCache = { at: Date.now(), items: listCache?.items ?? fixtureList(), ok: false };
      return listCache.items;
    } finally {
      listInFlight = null;
    }
  })();
  if (listCache?.items.length) {
    return { items: listCache.items };
  }
  const items = await raceWithBudget(listInFlight, fixtureList(), livePageBudgetMs());
  return { items };
}

export async function loadOpenPositionDetail(publicId: string): Promise<OpenPositionDetail | null> {
  const cached = detailCache.get(publicId);
  if (cached && Date.now() - cached.at < JOB_OPENINGS_SYNC_TTL_MS) {
    return cached.detail;
  }
  if (!isJobOpeningsEnabled()) {
    return fixtureDetail(publicId);
  }
  const backendId = parseJobBackendId(publicId);
  if (!backendId || !/^\d+$/.test(backendId)) {
    return fixtureDetail(publicId);
  }
  try {
    const row = await fetchJobOpeningDetail(backendId);
    if ((row.content_type || '').toLowerCase() !== 'job_openings') {
      return fixtureDetail(publicId);
    }
    if ((row.status || '').toLowerCase() !== 'published') {
      return null;
    }
    const detail = mapJobOpeningDetail(row);
    detailCache.set(publicId, { at: Date.now(), detail });
    return detail;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn('Job opening detail load failed', { publicId, message });
    return fixtureDetail(publicId) ?? cached?.detail ?? null;
  }
}
