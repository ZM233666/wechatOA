import { ERROR_CODES } from '@app/shared';
import type { Request, Response } from 'express';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { getFixtures } from '../services/fixture.service';
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

export function getCanteen(req: Request, res: Response): void {
  const location = resolveCampusLocation(req);
  const canteen = getFixtures().canteenByLocation[location];
  if (!canteen) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { location });
  }
  if (req.mockScenario === 'empty') {
    success(res, withAbsoluteAssets(req, { intro: canteen.intro, menuItems: [], location }), req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, { ...canteen, location }), req.requestId);
}

export function getShuttle(req: Request, res: Response): void {
  const location = resolveCampusLocation(req);
  const shuttle = getFixtures().shuttleByLocation[location];
  if (!shuttle) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, { location });
  }
  if (req.mockScenario === 'empty') {
    success(res, withAbsoluteAssets(req, { notice: shuttle.notice, routes: [], location }), req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, { ...shuttle, location }), req.requestId);
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
  const items = getFixtures().wetalkIssues.map(({ pages: _pages, ...summary }) => summary);
  if (req.mockScenario === 'empty') {
    success(res, { items: [] }, req.requestId);
    return;
  }
  success(res, withAbsoluteAssets(req, { items }), req.requestId);
}

export function getWetalkIssueDetail(req: Request, res: Response): void {
  const issue = getFixtures().wetalkIssues.find((item) => item.id === req.params.id);
  if (!issue) {
    throw new HttpError(404, 'Resource not found', ERROR_CODES.RESOURCE_NOT_FOUND, {
      id: req.params.id,
    });
  }
  success(res, withAbsoluteAssets(req, issue), req.requestId);
}

export function getCampusMap(req: Request, res: Response): void {
  const location = resolveCampusLocation(req);
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
