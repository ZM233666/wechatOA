import { ERROR_CODES } from '@app/shared';
import type { NextFunction, Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures, refreshCampusMapFromPdf, refreshWetalkIssueFromDisk, syncPdfDrivenCatalogs } from '../services/fixture.service';
import { planShuttleTrip } from '../services/shuttle-trip-plan.service';
import { loadLiveShuttle } from '../services/shuttle-schedule.service';
import { loadLiveCanteen } from '../services/lunch-menu.service';
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

export function getKbLifeEntries(req: Request, res: Response): void {
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
  success(res, withAbsoluteAssets(req, getFixtures().kbLifeEntries), req.requestId);
}

export async function getCanteen(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const location = resolveCampusLocation(req);
    const canteen = getFixtures().canteenByLocation[location];
    if (!canteen) {
      throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { location });
    }
    if (req.mockScenario === 'empty') {
      success(res, withAbsoluteAssets(req, { intro: canteen.intro, menuItems: [], sections: [], location }), req.requestId);
      return;
    }
    const live = await loadLiveCanteen(location);
    if (live) {
      success(
        res,
        withAbsoluteAssets(req, {
          intro: canteen.intro,
          menuItems: [],
          location,
          live: true,
          title: live.title,
          menuDate: live.menuDate,
          coverImage: live.coverImage,
          sections: live.sections,
        }),
        req.requestId,
      );
      return;
    }
    success(res, withAbsoluteAssets(req, { ...canteen, location, live: false }), req.requestId);
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

export function getActivities(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    success(
      res,
      withAbsoluteAssets(req, {
        ...getFixtures().activities,
        items: [],
        outings: [],
      }),
      req.requestId,
    );
    return;
  }
  success(res, withAbsoluteAssets(req, getFixtures().activities), req.requestId);
}

export function getWetalkIssues(req: Request, res: Response): void {
  syncPdfDrivenCatalogs();
  const items = getFixtures().wetalkIssues.map(({ pages: _pages, ...summary }) => summary);
  if (req.mockScenario === 'empty') {
    success(res, { items: [] }, req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, { items }), req.requestId);
}

export function getWetalkIssueDetail(req: Request, res: Response): void {
  const id = String(req.params.id);
  const issue =
    refreshWetalkIssueFromDisk(id) ??
    getFixtures().wetalkIssues.find((item) => item.id === id);
  if (!issue) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id,
    });
  }
  success(res, withAbsoluteAssets(req, issue), req.requestId);
}

export function getCampusMap(req: Request, res: Response): void {
  const location = resolveCampusLocation(req);
  refreshCampusMapFromPdf(location);
  const campusMap = getFixtures().campusMapByLocation[location];
  if (!campusMap) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { location });
  }
  success(res, withAbsoluteAssets(req, { ...campusMap, location }), req.requestId);
}

export function getHolidayCalendar(req: Request, res: Response): void {
  const location = resolveCampusLocation(req);
  const holiday = getFixtures().holidayByLocation[location];
  if (!holiday) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { location });
  }
  success(res, holiday, req.requestId);
}
