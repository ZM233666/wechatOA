import type { HighlightMomentsDetail } from '@app/shared';
import { mockEnv } from '../config/env';
import { highlightMomentsDetailLiveSchema } from '../schemas/kb-life.schema';
import { logInfo, logWarn } from '../utils/logger';
import { livePageBudgetMs, raceWithBudget } from './live-api-timeout';
import {
  fetchMiniKbLifeActivitiesRaw,
  isHighlightMomentsLiveEnabled,
} from './highlight-moments-live.client';

const HIGHLIGHT_MOMENTS_FAILURE_TTL_MS = 30_000;

function highlightMomentsSyncTtlMs(): number {
  return mockEnv.HIGHLIGHT_MOMENTS_SYNC_TTL_MS;
}

type CacheEntry = {
  at: number;
  data: HighlightMomentsDetail | null | undefined;
  ok: boolean;
};

let cache: CacheEntry | null = null;
let inFlight: Promise<HighlightMomentsDetail | null | undefined> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractActivitiesPayload(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return null;
  }
  if (raw.success === true && isRecord(raw.data)) {
    return raw.data;
  }
  if (raw.code === 2000 && isRecord(raw.data)) {
    return raw.data;
  }
  return raw;
}

function parseHighlightMoments(raw: unknown): HighlightMomentsDetail | null {
  const activities = extractActivitiesPayload(raw);
  if (!isRecord(activities)) {
    throw new Error('activities 响应无法解析');
  }
  const parsed = highlightMomentsDetailLiveSchema.nullable().safeParse(activities.highlightMoments);
  if (!parsed.success) {
    throw new Error(`highlightMoments 字段校验失败: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function fetchLiveHighlightMoments(): Promise<HighlightMomentsDetail | null> {
  const raw = await fetchMiniKbLifeActivitiesRaw();
  const highlightMoments = parseHighlightMoments(raw);
  logInfo('Loaded highlight moments from Django Mini API', {
    albums: highlightMoments?.albums.length ?? 0,
  });
  return highlightMoments;
}

/**
 * @returns
 * - `undefined`：未启用 live，Mock 继续使用 fixture
 * - `null`：已启用但无数据或拉取失败（不再回退 fixture）
 * - 对象：Django 返回的 highlightMoments
 */
export async function loadLiveHighlightMoments(): Promise<HighlightMomentsDetail | null | undefined> {
  if (!isHighlightMomentsLiveEnabled()) {
    return undefined;
  }
  const now = Date.now();
  if (cache && now - cache.at < (cache.ok ? highlightMomentsSyncTtlMs() : HIGHLIGHT_MOMENTS_FAILURE_TTL_MS)) {
    return cache.data;
  }
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    try {
      const data = await raceWithBudget(fetchLiveHighlightMoments(), null, livePageBudgetMs());
      cache = { at: Date.now(), data, ok: true };
      return data;
    } catch (error) {
      logWarn('Highlight moments live load failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      cache = { at: Date.now(), data: cache?.ok ? cache.data : null, ok: false };
      return cache.data ?? null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
