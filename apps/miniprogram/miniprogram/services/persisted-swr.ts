import {
  hasStaleWhileRevalidateCache,
  primeStaleWhileRevalidateCache,
  withStaleWhileRevalidate,
} from './request';

const STORAGE_PREFIX = 'persistedSwr:v1:';

type PersistedEnvelope<T> = {
  savedAt: number;
  value: T;
};

function storageKey(cacheKey: string): string {
  return `${STORAGE_PREFIX}${cacheKey}`;
}

function readPersistedEnvelope<T>(cacheKey: string): PersistedEnvelope<T> | null {
  try {
    const raw = wx.getStorageSync(storageKey(cacheKey));
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const envelope = raw as Partial<PersistedEnvelope<T>>;
    if (typeof envelope.savedAt !== 'number' || envelope.value === undefined) {
      return null;
    }
    return { savedAt: envelope.savedAt, value: envelope.value as T };
  } catch {
    return null;
  }
}

function writePersistedEnvelope<T>(cacheKey: string, value: T): void {
  try {
    wx.setStorageSync(storageKey(cacheKey), {
      savedAt: Date.now(),
      value,
    } satisfies PersistedEnvelope<T>);
  } catch {
    // ignore quota / permission
  }
}

/** 同步读取持久化快照（供 Tab 首屏灌入，不触发网络） */
export function readPersistedSnapshot<T>(cacheKey: string, maxAgeMs: number): T | null {
  const envelope = readPersistedEnvelope<T>(cacheKey);
  if (!envelope) {
    return null;
  }
  if (Date.now() - envelope.savedAt > maxAgeMs) {
    return null;
  }
  return envelope.value;
}

export function clearPersistedSnapshots(prefix?: string): void {
  try {
    const info = wx.getStorageInfoSync();
    const needle = prefix ? `${STORAGE_PREFIX}${prefix}` : STORAGE_PREFIX;
    for (const key of info.keys) {
      if (key.startsWith(needle)) {
        wx.removeStorageSync(key);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * 内存 SWR + wx.storage 冷启动回放；成功后会写回磁盘。
 * maxAge 与 freshTtl + staleTtl 对齐。
 */
export async function withPersistedStaleWhileRevalidate<T>(
  cacheKey: string,
  freshTtlMs: number,
  staleTtlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  if (!hasStaleWhileRevalidateCache(cacheKey)) {
    const maxAgeMs = freshTtlMs + staleTtlMs;
    const envelope = readPersistedEnvelope<T>(cacheKey);
    if (envelope && Date.now() - envelope.savedAt <= maxAgeMs) {
      primeStaleWhileRevalidateCache(cacheKey, envelope.value, freshTtlMs, staleTtlMs, envelope.savedAt);
    }
  }

  return withStaleWhileRevalidate(cacheKey, freshTtlMs, staleTtlMs, async () => {
    const value = await loader();
    writePersistedEnvelope(cacheKey, value);
    return value;
  });
}