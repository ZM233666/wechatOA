import { mockEnv } from '../config/env';

/** 上游 Django 单次请求超时，应小于小程序默认 15s，便于失败时快速回退 fixture */
export function liveApiTimeoutMs(): number {
  return mockEnv.LIVE_API_TIMEOUT_MS;
}

/** 页面接口最多等待这么久，超时先回退缓存/fixture，后台继续刷新 */
export function livePageBudgetMs(): number {
  return Math.min(liveApiTimeoutMs(), 2_000);
}

export function isLiveApiTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === 'AbortError') {
    return true;
  }
  return /aborted|timeout|timed out/i.test(error.message);
}

export async function raceWithBudget<T>(pending: Promise<T>, fallback: T, budgetMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), budgetMs);
  });
  try {
    return await Promise.race([pending, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
