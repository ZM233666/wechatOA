import { mockEnv } from '../config/env';
import type { BrandOverview } from '../schemas/brand.schema';
import { logInfo, logWarn } from '../utils/logger';
import {
  BRAND_INTRO_SYNC_TTL_MS,
  fetchBrandIntroFromBackend,
  isBrandIntroEnabled,
} from './brand-intro.client';
import { mapBrandIntroRowToOverview } from './brand-intro.mapper';

type SyncState = {
  lastAttemptMs: number;
  lastSuccessMs: number;
  lastError?: string;
  inFlight: Promise<BrandOverview | null> | null;
  brand: BrandOverview | null;
};

const state: SyncState = {
  lastAttemptMs: 0,
  lastSuccessMs: 0,
  inFlight: null,
  brand: null,
};

export async function syncBrandIntro(options?: {
  force?: boolean;
  ttlMs?: number;
}): Promise<BrandOverview | null> {
  if (!isBrandIntroEnabled()) {
    return null;
  }
  const ttlMs = options?.ttlMs ?? BRAND_INTRO_SYNC_TTL_MS;
  const now = Date.now();
  if (!options?.force && state.inFlight) {
    return state.inFlight;
  }
  if (!options?.force && now - state.lastSuccessMs < ttlMs && state.brand) {
    return state.brand;
  }

  const run = (async () => {
    state.lastAttemptMs = Date.now();
    try {
      const row = await fetchBrandIntroFromBackend();
      if (!row) {
        state.brand = null;
        state.lastSuccessMs = Date.now();
        state.lastError = undefined;
        logInfo('Brand intro backend returned empty published data');
        return null;
      }
      const brand = mapBrandIntroRowToOverview(row, mockEnv.BRAND_INTRO_MEDIA_BASE_URL);
      state.brand = brand;
      state.lastSuccessMs = Date.now();
      state.lastError = undefined;
      logInfo('Synced brand intro from backend', { id: row.id, companyName: brand.companyName });
      return brand;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      state.lastError = message;
      logWarn('Brand intro sync failed; keeping previous cache/fixtures fallback', { message });
      return state.brand;
    } finally {
      state.inFlight = null;
    }
  })();

  state.inFlight = run;
  return run;
}

export function refreshBrandIntroInBackground(): void {
  if (!isBrandIntroEnabled()) {
    return;
  }
  void syncBrandIntro();
}

export function getCachedBrandIntro(): BrandOverview | null {
  return state.brand;
}

export function getBrandIntroStatus(): {
  enabled: boolean;
  count: number;
  lastError?: string;
  lastSuccessMs: number;
} {
  return {
    enabled: isBrandIntroEnabled(),
    count: state.brand ? 1 : 0,
    lastError: state.lastError,
    lastSuccessMs: state.lastSuccessMs,
  };
}
