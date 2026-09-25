import type { ShuttleTripLegPlan, ShuttleTripMode, ShuttleTripPlanData } from '@app/shared';
import { getFixtures } from './fixture.service';
import { campusMapCenter } from './shuttle-schedule.mapper';
import { campusCodeFromLocation, loadLiveShuttle } from './shuttle-schedule.service';
import {
  collectShuttleStops,
  formatDistance,
  formatDuration,
  haversineMeters,
  parseLatLngPair,
  type ShuttleStopIndexItem,
} from './shuttle-trip-plan.utils';
import { fetchDirectionPlan, geocodeAddress } from './tencent-map.client';
import { HttpError } from '../middleware/error-handler.middleware';
import { ERROR_CODES } from '@app/shared';

const GEO_REGION: Record<string, string> = {
  suzhou: '苏州市',
  qingdao: '青岛市',
  daxing: '北京市',
  nankou: '北京市',
};

const MODE_LABEL: Record<ShuttleTripMode, string> = {
  transit: '地铁/公交',
  bicycling: '骑行',
  walking: '步行',
};

const NEARBY_STOP_LIMIT = 3;

function estimatePlan(mode: ShuttleTripMode, distanceMeters: number, transitFallback = false): ShuttleTripLegPlan {
  const speedMps: Record<ShuttleTripMode, number> = {
    walking: 1.35,
    bicycling: 4.2,
    transit: 6.5,
  };
  const durationMinutes = Math.max(1, Math.round(distanceMeters / speedMps[mode] / 60));
  const distanceLabel = formatDistance(distanceMeters);
  const durationLabel = formatDuration(durationMinutes);
  const modeLabel = MODE_LABEL[mode];
  const suffix = mode === 'transit' && transitFallback ? '（估算）' : '';
  const summary = `${modeLabel} ${distanceLabel} · ${durationLabel}${suffix}`;
  return {
    mode,
    modeLabel,
    durationMinutes,
    distanceMeters: Math.round(distanceMeters),
    summary,
  };
}

async function buildLegPlan(
  mode: ShuttleTripMode,
  from: { latitude: number; longitude: number },
  to: ShuttleStopIndexItem,
): Promise<ShuttleTripLegPlan> {
  const straight = haversineMeters(from, to);
  const apiMode =
    mode === 'transit' ? 'transit' : mode === 'bicycling' ? 'bicycling' : 'walking';
  try {
    const route = await fetchDirectionPlan(apiMode, from, {
      latitude: to.latitude,
      longitude: to.longitude,
    });
    const durationMinutes = Math.max(1, Math.ceil(route.durationSeconds / 60));
    const distanceMeters = Math.round(route.distanceMeters || straight);
    const hint = route.summaryHint ? ` · ${route.summaryHint}` : '';
    return {
      mode,
      modeLabel: MODE_LABEL[mode],
      durationMinutes,
      distanceMeters,
      summary: `${MODE_LABEL[mode]} ${formatDistance(distanceMeters)} · ${formatDuration(durationMinutes)}${hint}`,
    };
  } catch {
    return estimatePlan(mode, straight, mode === 'transit');
  }
}

function matchStopByNameExact(stops: ShuttleStopIndexItem[], query: string): ShuttleStopIndexItem | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return stops.find((stop) => stop.stopName.trim().toLowerCase() === normalized) ?? null;
}

async function resolveDestination(
  destination: string,
  region: string | undefined,
  stops: ShuttleStopIndexItem[],
  anchor: { latitude: number; longitude: number },
  coords?: { latitude?: number; longitude?: number; name?: string },
): Promise<{ name: string; latitude: number; longitude: number }> {
  if (Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude)) {
    return {
      name: coords?.name?.trim() || destination.trim() || '已选位置',
      latitude: coords!.latitude as number,
      longitude: coords!.longitude as number,
    };
  }
  const trimmed = destination.trim();
  if (!trimmed) {
    throw new HttpError(400, '请输入目的地', ERROR_CODES.VALIDATION_ERROR);
  }
  const asCoord = parseLatLngPair(trimmed);
  if (asCoord) {
    return { name: trimmed, ...asCoord };
  }
  const stopMatch = matchStopByNameExact(stops, trimmed);
  if (stopMatch) {
    return {
      name: stopMatch.stopName,
      latitude: stopMatch.latitude,
      longitude: stopMatch.longitude,
    };
  }
  try {
    return await geocodeAddress(trimmed, { region, anchor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '地理编码失败';
    throw new HttpError(
      400,
      `无法解析目的地「${trimmed}」：${message}`,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }
}

async function loadShuttleMap(location: string) {
  const live = await loadLiveShuttle(location);
  if (live?.map?.routes?.length) {
    return live.map;
  }
  const fixture = getFixtures().shuttleByLocation[location];
  return fixture?.map;
}

export async function planShuttleTrip(
  location: string,
  destination: string,
  coords?: { latitude?: number; longitude?: number; name?: string },
): Promise<ShuttleTripPlanData> {
  const map = await loadShuttleMap(location);
  const stops = collectShuttleStops(map);
  if (stops.length === 0) {
    throw new HttpError(404, '暂无带经纬度的班车站点', ERROR_CODES.RESOURCE_NOT_FOUND);
  }
  const campus = campusCodeFromLocation(location);
  const region = GEO_REGION[campus];
  const anchor = map?.center ?? campusMapCenter(campus);
  const dest = await resolveDestination(destination, region, stops, anchor, coords);
  const ranked = stops
    .map((stop) => ({
      stop,
      distanceMeters: haversineMeters(dest, stop),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, NEARBY_STOP_LIMIT);

  const nearbyStops = await Promise.all(
    ranked.map(async ({ stop, distanceMeters }) => {
      const modes: ShuttleTripMode[] = ['transit', 'bicycling', 'walking'];
      const plans = await Promise.all(
        modes.map((mode) => buildLegPlan(mode, dest, stop)),
      );
      return {
        stopId: stop.stopId,
        stopName: stop.stopName,
        timesText: stop.timesText,
        latitude: stop.latitude,
        longitude: stop.longitude,
        distanceMeters: Math.round(distanceMeters),
        shuttleLineNames: stop.shuttleLineNames,
        plans,
      };
    }),
  );

  return {
    destination: dest,
    nearbyStops,
  };
}
