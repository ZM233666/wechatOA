import type { EmployeeCareData } from '@app/shared';
import { logInfo, logWarn } from '../utils/logger';
import { livePageBudgetMs, raceWithBudget } from './live-api-timeout';
import { campusCodeFromLocation } from './lunch-menu.service';
import { fetchLocalGlobalCareCurrent, isLocalGlobalCareEnabled } from './local-global-care.client';
import { mapLocalGlobalCareToEmployeeCare } from './local-global-care.mapper';
import { getFixtures } from './fixture.service';

export const LOCAL_GLOBAL_CARE_SYNC_TTL_MS = 5 * 60_000;
const LOCAL_GLOBAL_CARE_FAILURE_TTL_MS = 30_000;

type CacheEntry = {
  at: number;
  data: EmployeeCareData | null;
  ok: boolean;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<EmployeeCareData | null>>();

function cacheTtl(entry: CacheEntry): number {
  return entry.ok ? LOCAL_GLOBAL_CARE_SYNC_TTL_MS : LOCAL_GLOBAL_CARE_FAILURE_TTL_MS;
}

async function fetchLiveEmployeeCare(campus: string): Promise<EmployeeCareData | null> {
  const row = await fetchLocalGlobalCareCurrent(campus);
  if (!row) {
    return null;
  }
  const fallback = getFixtures().employeeCare;
  const mapped = mapLocalGlobalCareToEmployeeCare(row, campus, fallback.hero);
  logInfo('Loaded employee care from management API', {
    campus,
    initiatives: mapped.initiatives.length,
  });
  return mapped;
}

/** 员工关怀默认苏州园区（与 CMS 每园区一条记录一致；后续可按 profile 扩展） */
export function defaultCareCampus(): string {
  return 'suzhou';
}

export async function loadLiveEmployeeCare(campus = defaultCareCampus()): Promise<EmployeeCareData | null> {
  if (!isLocalGlobalCareEnabled()) {
    return null;
  }
  const cached = cache.get(campus);
  if (cached && Date.now() - cached.at < cacheTtl(cached)) {
    return cached.data;
  }
  const pending = inFlight.get(campus);
  if (pending) {
    return cached?.data ?? raceWithBudget(pending, null, livePageBudgetMs());
  }
  const run = (async () => {
    try {
      const data = await fetchLiveEmployeeCare(campus);
      cache.set(campus, { at: Date.now(), data, ok: true });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Employee care load failed', { campus, message });
      cache.set(campus, { at: Date.now(), data: cached?.data ?? null, ok: false });
      return cached?.data ?? null;
    } finally {
      inFlight.delete(campus);
    }
  })();
  inFlight.set(campus, run);
  if (cached?.data) {
    return cached.data;
  }
  return raceWithBudget(run, null, livePageBudgetMs());
}

/** 预留：若 KB Life 传入 location，可映射为关怀 campus */
export function careCampusFromLocation(location: string): string {
  return campusCodeFromLocation(location);
}
