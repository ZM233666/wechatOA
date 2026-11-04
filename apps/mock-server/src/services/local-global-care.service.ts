import type { EmployeeCareData } from '@app/shared';
import { logInfo, logWarn } from '../utils/logger';
import { campusCodeFromLocation } from './lunch-menu.service';
import {
  fetchLocalGlobalCareCurrent,
  fetchMiniLocalGlobalCare,
  isLocalGlobalCareEnabled,
} from './local-global-care.client';

export { isLocalGlobalCareEnabled };
import {
  collectMiniCareArticles,
  mapMiniLocalGlobalCareToEmployeeCare,
  type MiniCareArticleDto,
} from './local-global-care-mini.mapper';
import { mapLocalGlobalCareToEmployeeCare } from './local-global-care.mapper';
import type { KbLifeBanner } from '@app/shared';
import {
  selectKbLifeCareBanners,
  selectKbLifeCareBannersFromMini,
} from './kb-life-banner.service';
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
const miniArticleById = new Map<number, MiniCareArticleDto>();

export function rememberMiniCareArticles(
  articles: MiniCareArticleDto[],
  options?: { replace?: boolean },
): void {
  if (options?.replace) {
    const keep = new Set(articles.map((article) => article.id));
    for (const id of miniArticleById.keys()) {
      if (!keep.has(id)) {
        miniArticleById.delete(id);
      }
    }
  }
  for (const article of articles) {
    if (article?.id != null && article.contentHtml) {
      miniArticleById.set(article.id, article);
    }
  }
}

export function getCachedMiniCareArticle(id: number): MiniCareArticleDto | undefined {
  return miniArticleById.get(id);
}

function cacheTtl(entry: CacheEntry): number {
  return entry.ok ? LOCAL_GLOBAL_CARE_SYNC_TTL_MS : LOCAL_GLOBAL_CARE_FAILURE_TTL_MS;
}

async function fetchLiveEmployeeCare(campus: string): Promise<EmployeeCareData | null> {
  const fallback = getFixtures().employeeCare;

  try {
    const mini = await fetchMiniLocalGlobalCare(campus);
    const articleCount =
      (mini?.local?.articles?.length ?? 0) + (mini?.global?.articles?.length ?? 0);
    if (mini && articleCount > 0) {
      rememberMiniCareArticles(collectMiniCareArticles(mini), { replace: true });
      const mapped = mapMiniLocalGlobalCareToEmployeeCare(mini, fallback.hero);
      logInfo('Loaded employee care from Django Mini API', {
        campus,
        initiatives: mapped.initiatives.length,
      });
      return mapped;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn('Django Mini local-global-care failed, trying legacy care/current', {
      campus,
      message,
    });
  }

  const row = await fetchLocalGlobalCareCurrent(campus);
  if (!row) {
    return null;
  }
  const mapped = mapLocalGlobalCareToEmployeeCare(row, campus, fallback.hero);
  logInfo('Loaded employee care from legacy management API', {
    campus,
    initiatives: mapped.initiatives.length,
  });
  return mapped;
}

/** 员工关怀默认苏州园区（与 CMS 每园区一条记录一致；后续可按 profile 扩展） */
export function defaultCareCampus(): string {
  return 'suzhou';
}

export async function loadLiveEmployeeCare(
  campus = defaultCareCampus(),
  options?: { force?: boolean },
): Promise<EmployeeCareData | null> {
  if (!isLocalGlobalCareEnabled()) {
    return null;
  }
  const cached = cache.get(campus);
  if (!options?.force && cached && Date.now() - cached.at < cacheTtl(cached)) {
    return cached.data;
  }
  const pending = inFlight.get(campus);
  if (pending) {
    return pending;
  }
  const previous = cached;
  const run = (async () => {
    try {
      const data = await fetchLiveEmployeeCare(campus);
      cache.set(campus, { at: Date.now(), data, ok: true });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Employee care load failed', { campus, message });
      cache.set(campus, { at: Date.now(), data: previous?.ok ? previous.data : null, ok: false });
      return previous?.ok ? previous.data : null;
    } finally {
      inFlight.delete(campus);
    }
  })();
  inFlight.set(campus, run);
  /** 列表页必须等到最新稿；其它入口可先返回旧数据后台刷新 */
  if (!options?.force && previous?.ok) {
    return previous.data;
  }
  return run;
}

/** 预留：若 KB Life 传入 location，可映射为关怀 campus */
export function careCampusFromLocation(location: string): string {
  return campusCodeFromLocation(location);
}

/** 顶栏 Banner / 关怀页共用：Live 优先，否则 fixture */
export async function resolveEmployeeCareData(campus = defaultCareCampus()): Promise<EmployeeCareData> {
  const fallback = getFixtures().employeeCare;
  const live = await loadLiveEmployeeCare(campus);
  return live ?? fallback;
}

/** KB Life 顶栏：轮播全部置顶关怀稿（与首页新闻 Banner 同源逻辑） */
export async function resolveKbLifeCareBanners(campus = defaultCareCampus()): Promise<KbLifeBanner[]> {
  if (isLocalGlobalCareEnabled()) {
    try {
      const mini = await fetchMiniLocalGlobalCare(campus);
      if (mini) {
        rememberMiniCareArticles(collectMiniCareArticles(mini), { replace: true });
        const fromMini = selectKbLifeCareBannersFromMini(mini);
        if (fromMini.length > 0) {
          return fromMini;
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('KB Life care banners from Mini API failed', { campus, message });
    }
  }
  const care = await resolveEmployeeCareData(campus);
  return selectKbLifeCareBanners(care.initiatives);
}
