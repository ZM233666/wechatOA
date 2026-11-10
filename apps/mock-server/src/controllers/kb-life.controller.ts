import { ERROR_CODES } from '@app/shared';
import type { NextFunction, Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import {
  getFixtures,
  readJsonFile,
  refreshCampusMapFromPdf,
  refreshWetalkIssueFromDisk,
  syncPdfDrivenCatalogs,
} from '../services/fixture.service';
import { kbLifeEntriesSchema } from '../schemas/kb-life.schema';
import { planShuttleTrip } from '../services/shuttle-trip-plan.service';
import { loadLiveShuttle } from '../services/shuttle-schedule.service';
import { loadLiveCampusMap } from '../services/campus-map.service';
import { loadEmployeeHandbook } from '../services/employee-handbook.service';
import { loadFinancialHandbook } from '../services/financial-handbook.service';
import { loadGuidanceDocuments } from '../services/guidance-documents.service';
import {
  careCampusFromLocation,
  isLocalGlobalCareEnabled,
  loadLiveEmployeeCare,
} from '../services/local-global-care.service';
import { resolveKbLifeCareBanners } from '../services/local-global-care.service';
import {
  hydrateEmployeeCareMedia,
  hydrateHighlightMomentsAlbum,
  hydrateHighlightMomentsMedia,
  hydrateKbLifeBanners,
  invalidateHydratedCareArticleDetails,
  loadHydratedCareArticleDetail,
  prewarmCareArticleDetails,
  prewarmHighlightMomentsMedia,
} from '../services/kb-life-media-mirror.service';
import { loadOpenPositionDetail, loadOpenPositionsList } from '../services/job-openings.service';
import { loadLiveCanteen, shanghaiMenuDate } from '../services/lunch-menu.service';
import { activitiesResponseWithoutFakeData, loadLiveActivities } from '../services/company-events.service';
import { loadLiveHighlightMoments } from '../services/highlight-moments-live.service';
import {
  loadWetalkCmsPdfIssue,
  loadWetalkNewsDetail,
  loadWetalkNewsSummaries,
} from '../services/article-wetalk.service';
import {
  requireBoundIdentity,
  requireEmployeeIdentity,
  requireGuidanceDocumentsIdentity,
} from '../services/identity-guard.service';
import { HttpError } from '../middleware/error-handler.middleware';
import { success } from '../utils/response';

function resolveCampusLocation(req: Request): string {
  const locations = getFixtures().kbLifeEntries.locations;
  const fallback = locations[0] ?? 'Suzhou';
  const raw = typeof req.query.location === 'string' ? req.query.location.trim() : '';
  if (raw && locations.includes(raw)) {
    return raw;
  }
  return fallback;
}

export async function getKbLifeEntries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.mockScenario === 'empty') {
      const empty = {
        banners: [],
        locations: getFixtures().kbLifeEntries.locations,
        campusServices: [],
        employeeServices: [],
      };
      success(res, withAbsoluteAssets(req, empty), req.requestId);
      return;
    }
    const kbLifeEntries = readJsonFile('kb-life/entries.json', kbLifeEntriesSchema);
    const campus = careCampusFromLocation(resolveCampusLocation(req));
    const careBanners = await resolveKbLifeCareBanners(campus);
    const useCareBanners = careBanners.length > 0;
    const banners = useCareBanners ? await hydrateKbLifeBanners(careBanners) : kbLifeEntries.banners;
    success(
      res,
      withAbsoluteAssets(req, {
        ...kbLifeEntries,
        banners,
      }),
      req.requestId,
    );
    prewarmCareArticleDetails(
      (useCareBanners ? careBanners : []).map((banner) => banner.id),
      campus,
    );
  } catch (error) {
    next(error);
  }
}

export async function getCanteen(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireBoundIdentity(req);
    const location = resolveCampusLocation(req);
    const canteen = getFixtures().canteenByLocation[location];
    if (!canteen) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { location });
    }
    const today = shanghaiMenuDate();
    const live = req.mockScenario === 'empty' ? null : await loadLiveCanteen(location);
    const menu = live ?? {
      live: true as const,
      title: '今日午餐',
      menuDate: today,
      sections: [] as [],
    };
    success(
      res,
      withAbsoluteAssets(req, {
        intro: canteen.intro,
        menuItems: [],
        location,
        live: true,
        title: menu.title,
        menuDate: menu.menuDate,
        coverImage: 'coverImage' in menu ? menu.coverImage : undefined,
        sections: menu.sections,
      }),
      req.requestId,
    );
  } catch (error) {
    next(error);
  }
}

function parseOptionalCoord(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function getShuttleTripPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireBoundIdentity(req);
    const location = resolveCampusLocation(req);
    const destination = typeof req.query.destination === 'string' ? req.query.destination : '';
    const latitude = parseOptionalCoord(req.query.latitude);
    const longitude = parseOptionalCoord(req.query.longitude);
    const name = typeof req.query.name === 'string' ? req.query.name : undefined;
    const data = await planShuttleTrip(location, destination, { latitude, longitude, name });
    success(res, { ...data, location }, req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getShuttle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireBoundIdentity(req);
    const location = resolveCampusLocation(req);
    if (req.mockScenario === 'empty') {
      success(res, withAbsoluteAssets(req, { notice: '', routes: [], location }), req.requestId);
      return;
    }
    const live = await loadLiveShuttle(location);
    if (live) {
      success(res, withAbsoluteAssets(req, { ...live, location }), req.requestId);
      return;
    }
    const shuttle = getFixtures().shuttleByLocation[location];
    if (!shuttle) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { location });
    }
    success(res, withAbsoluteAssets(req, { ...shuttle, location }), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.mockScenario === 'empty') {
      success(
        res,
        withAbsoluteAssets(req, {
          ...getFixtures().activities,
          live: true,
          items: [],
          annualDinner: null,
          outings: [],
          health: null,
          highlightMoments: null,
        }),
        req.requestId,
      );
      return;
    }
    const [live, highlightMomentsLive] = await Promise.all([
      loadLiveActivities(),
      loadLiveHighlightMoments(),
    ]);
    let payload = live ?? activitiesResponseWithoutFakeData();
    if (highlightMomentsLive !== undefined) {
      payload = {
        ...payload,
        highlightMoments: highlightMomentsLive
          ? await hydrateHighlightMomentsMedia(highlightMomentsLive, { mode: 'covers' })
          : null,
      };
      if (highlightMomentsLive) {
        prewarmHighlightMomentsMedia(highlightMomentsLive);
      }
    }
    success(res, withAbsoluteAssets(req, payload), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getWetalkIssues(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireEmployeeIdentity(req);
    if (req.mockScenario === 'empty') {
      success(res, { items: [] }, req.requestId);
      return;
    }
    // WeTalk News：优先管理端 content_type=wetalk 已发布文章
    const newsItems = await loadWetalkNewsSummaries({ force: true });
    if (newsItems.length) {
      success(res, withAbsoluteAssets(req, { items: newsItems }), req.requestId);
      return;
    }
    // 无 CMS 新闻时回退 MinIO/本地 PDF 期次（杂志）
    syncPdfDrivenCatalogs();
    const items = getFixtures().wetalkIssues.map(({ pages: _pages, ...summary }) => summary);
    success(res, withAbsoluteAssets(req, { items }), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getWetalkIssueDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireEmployeeIdentity(req);
    const id = String(req.params.id);
    const pdfIssue = await loadWetalkCmsPdfIssue(id, { force: true });
    if (pdfIssue) {
      success(res, withAbsoluteAssets(req, pdfIssue), req.requestId);
      return;
    }
    const newsDetail = await loadWetalkNewsDetail(id, { force: true });
    if (newsDetail) {
      success(res, withAbsoluteAssets(req, newsDetail), req.requestId);
      return;
    }
    const issue =
      refreshWetalkIssueFromDisk(id) ??
      getFixtures().wetalkIssues.find((item) => item.id === id);
    if (!issue) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
        id,
      });
    }
    success(res, withAbsoluteAssets(req, issue), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getCampusMap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireBoundIdentity(req);
    const location = resolveCampusLocation(req);
    if (req.mockScenario !== 'empty') {
      const live = await loadLiveCampusMap(location);
      if (live) {
        success(res, withAbsoluteAssets(req, { ...live, location }), req.requestId);
        return;
      }
    }
    refreshCampusMapFromPdf(location);
    const campusMap = getFixtures().campusMapByLocation[location];
    if (!campusMap) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { location });
    }
    success(res, withAbsoluteAssets(req, { ...campusMap, location }), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeHandbook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireGuidanceDocumentsIdentity(req);
    const data = await loadEmployeeHandbook();
    success(res, withAbsoluteAssets(req, data), req.requestId);
  } catch (error) {
    next(error);
  }
}

export function getGuidanceDocuments(req: Request, res: Response, next: NextFunction): void {
  try {
    requireGuidanceDocumentsIdentity(req);
    const data = loadGuidanceDocuments();
    success(res, withAbsoluteAssets(req, data), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getFinancialHandbook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireGuidanceDocumentsIdentity(req);
    const data = await loadFinancialHandbook();
    success(res, withAbsoluteAssets(req, data), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getOpenPositions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.mockScenario === 'empty') {
      success(res, withAbsoluteAssets(req, { items: [] }), req.requestId);
      return;
    }
    const data = await loadOpenPositionsList();
    success(res, withAbsoluteAssets(req, data), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getOpenPositionDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { id });
    }
    const detail = await loadOpenPositionDetail(id);
    if (!detail) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { id });
    }
    success(res, withAbsoluteAssets(req, detail), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getHighlightMomentAlbum(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { id });
    }
    const [live, highlightMomentsLive] = await Promise.all([
      loadLiveActivities(),
      loadLiveHighlightMoments(),
    ]);
    const section =
      highlightMomentsLive !== undefined
        ? highlightMomentsLive
        : (live ?? activitiesResponseWithoutFakeData()).highlightMoments;
    const album = section?.albums.find((item) => item.id === id);
    if (!album) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { id });
    }
    success(res, withAbsoluteAssets(req, await hydrateHighlightMomentsAlbum(album)), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeCareDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireBoundIdentity(req);
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { id });
    }
    const campus = careCampusFromLocation(resolveCampusLocation(req));
    const detail = await loadHydratedCareArticleDetail(id, campus, { force: true });
    if (!detail) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { id });
    }
    success(res, withAbsoluteAssets(req, detail), req.requestId);
  } catch (error) {
    next(error);
  }
}

export async function getEmployeeCare(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireBoundIdentity(req);
    const fixture = getFixtures().employeeCare;
    if (req.mockScenario === 'empty') {
      success(
        res,
        withAbsoluteAssets(req, {
          hero: fixture.hero,
          initiatives: [],
        }),
        req.requestId,
      );
      return;
    }
    const campus = careCampusFromLocation(resolveCampusLocation(req));
    const live = await loadLiveEmployeeCare(campus, { force: true });
    invalidateHydratedCareArticleDetails();
    const data = live
      ? await hydrateEmployeeCareMedia(live)
      : isLocalGlobalCareEnabled()
        ? { hero: fixture.hero, initiatives: [] }
        : fixture;
    success(res, withAbsoluteAssets(req, data), req.requestId);
    prewarmCareArticleDetails(
      data.initiatives.map((item) => item.id),
      campus,
    );
  } catch (error) {
    next(error);
  }
}

export function getHolidayCalendar(req: Request, res: Response): void {
  requireBoundIdentity(req);
  const location = resolveCampusLocation(req);
  const holiday = getFixtures().holidayByLocation[location];
  if (!holiday) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { location });
  }
  success(res, holiday, req.requestId);
}
