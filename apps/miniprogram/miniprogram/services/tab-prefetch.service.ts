import { getHome } from './home.service';
import { getKbLifeEntries } from './kb-life.service';
import { getServices } from './services.service';
import { getWetalkFeatured } from './wetalk.service';

let prefetchPromise: Promise<void> | null = null;

/** 启动后预热各 Tab 主接口（写入内存 SWR + 本地 storage） */
export function prefetchMainTabData(): Promise<void> {
  if (prefetchPromise) {
    return prefetchPromise;
  }
  const job = (async () => {
    try {
      await Promise.all([
        getHome().catch(() => undefined),
        getServices().catch(() => undefined),
        getKbLifeEntries().catch(() => undefined),
        getWetalkFeatured().catch(() => null),
      ]);
    } catch {
      // ignore individual tab prefetch failures
    }
    prefetchPromise = null;
  })();
  prefetchPromise = job;
  return job;
}