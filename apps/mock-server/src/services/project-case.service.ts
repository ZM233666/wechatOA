import type { z } from 'zod';
import { mockEnv } from '../config/env';
import type { caseCategorySchema, caseDetailSchema, caseSummarySchema } from '../schemas/case.schema';
import { getFixtures } from './fixture.service';
import { logInfo, logWarn } from '../utils/logger';
import {
  fetchAllPublishedProjectCases,
  fetchProjectCaseDetail,
  isProjectCaseEnabled,
  PROJECT_CASE_SYNC_TTL_MS,
} from './project-case.client';
import {
  mapProjectCaseRowToDetail,
  mapProjectCaseRowToSummary,
} from './project-case.mapper';

type CaseCategory = z.infer<typeof caseCategorySchema>;
type CaseDetail = z.infer<typeof caseDetailSchema>;
type CaseSummary = z.infer<typeof caseSummarySchema>;

type SyncState = {
  lastAttemptMs: number;
  lastSuccessMs: number;
  lastError?: string;
  inFlight: Promise<void> | null;
  summaries: CaseSummary[];
  categories: CaseCategory[];
  detailCache: Map<string, CaseDetail>;
};

const state: SyncState = {
  lastAttemptMs: 0,
  lastSuccessMs: 0,
  inFlight: null,
  summaries: [],
  categories: [],
  detailCache: new Map(),
};

function mediaBaseUrl(): string {
  return mockEnv.PROJECT_CASE_MEDIA_BASE_URL.replace(/\/+$/, '');
}

function deriveCategories(summaries: CaseSummary[]): CaseCategory[] {
  const map = new Map<string, string>();
  summaries.forEach((item) => {
    map.set(item.category.id, item.category.name);
  });
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

export async function syncProjectCase(options?: {
  force?: boolean;
  ttlMs?: number;
}): Promise<void> {
  if (!isProjectCaseEnabled()) {
    return;
  }
  const ttlMs = options?.ttlMs ?? PROJECT_CASE_SYNC_TTL_MS;
  const now = Date.now();
  if (!options?.force && state.inFlight) {
    await state.inFlight;
    return;
  }
  if (!options?.force && now - state.lastSuccessMs < ttlMs && state.summaries.length) {
    return;
  }

  const run = (async () => {
    state.lastAttemptMs = Date.now();
    try {
      const rows = await fetchAllPublishedProjectCases();
      const summaries = rows.map((row) => mapProjectCaseRowToSummary(row, mediaBaseUrl()));
      state.summaries = summaries;
      state.categories = deriveCategories(summaries);
      state.detailCache.clear();
      state.lastSuccessMs = Date.now();
      state.lastError = undefined;
      logInfo('Synced project cases from backend', { count: summaries.length });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      state.lastError = message;
      logWarn('Project case sync failed; keeping previous cache/fixtures fallback', { message });
    } finally {
      state.inFlight = null;
    }
  })();

  state.inFlight = run;
  await run;
}

export function refreshProjectCaseInBackground(): void {
  if (!isProjectCaseEnabled()) {
    return;
  }
  void syncProjectCase();
}

export function getCachedProjectCaseSummaries(): CaseSummary[] {
  return state.summaries;
}

export function getCachedProjectCaseCategories(): CaseCategory[] {
  return state.categories;
}

export function getProjectCaseStatus(): {
  enabled: boolean;
  count: number;
  lastSuccessMs: number;
  lastError?: string;
} {
  return {
    enabled: isProjectCaseEnabled(),
    count: state.summaries.length,
    lastSuccessMs: state.lastSuccessMs,
    lastError: state.lastError,
  };
}


async function ensureSummariesLoaded(): Promise<CaseSummary[]> {
  if (!isProjectCaseEnabled()) {
    return getFixtures().cases;
  }
  if (!state.summaries.length) {
    await syncProjectCase({ force: true });
  } else {
    refreshProjectCaseInBackground();
  }
  if (state.summaries.length) {
    return state.summaries;
  }
  return getFixtures().cases;
}

export async function getCaseCategoriesForRequest(): Promise<CaseCategory[]> {
  if (isProjectCaseEnabled()) {
    await ensureSummariesLoaded();
    if (state.categories.length) {
      return state.categories;
    }
  }
  return getFixtures().caseCategories;
}

export async function getCasesForRequest(): Promise<CaseSummary[]> {
  return ensureSummariesLoaded();
}

function resolveCaseId(idOrSlug: string, summaries: CaseSummary[]): string | null {
  const direct = summaries.find((item) => item.id === idOrSlug);
  if (direct) {
    return direct.id;
  }
  const numeric = idOrSlug.replace(/^case-/, '');
  const byNumeric = summaries.find((item) => item.id === numeric);
  return byNumeric?.id ?? null;
}

export async function getCaseDetailForRequest(id: string): Promise<CaseDetail | null> {
  if (isProjectCaseEnabled()) {
    const cached = state.detailCache.get(id);
    if (cached) {
      return cached;
    }
    const summaries = await ensureSummariesLoaded();
    const resolvedId = resolveCaseId(id, summaries) ?? id;
    if (state.summaries.length) {
      try {
        const row = await fetchProjectCaseDetail(resolvedId);
        const detail = mapProjectCaseRowToDetail(row, mediaBaseUrl());
        state.detailCache.set(detail.id, detail);
        state.detailCache.set(id, detail);
        return detail;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logWarn('Project case detail fetch failed', { id: resolvedId, message });
      }
    }
  }
  return findFixtureDetail(id) ?? null;
}

function findFixtureDetail(id: string): CaseDetail | undefined {
  return getFixtures().caseDetails.find((item) => item.id === id);
}
