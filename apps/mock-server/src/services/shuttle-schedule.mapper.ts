import type { ShuttleData, ShuttleMapData, ShuttleRoute, ShuttleStop } from '@app/shared';
import type { ShuttleScheduleRouteRow, ShuttleScheduleStopRow } from './shuttle-schedule.client';

const MAP_CENTER: Record<string, { latitude: number; longitude: number }> = {
  suzhou: { latitude: 31.29834, longitude: 120.58529 },
  qingdao: { latitude: 36.06708, longitude: 120.38264 },
  daxing: { latitude: 39.72684, longitude: 116.34159 },
  nankou: { latitude: 40.23221, longitude: 116.14816 },
};

export function campusMapCenter(locationCode: string): { latitude: number; longitude: number } {
  return MAP_CENTER[locationCode] ?? MAP_CENTER.suzhou;
}

const ROUTE_COLORS = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#9B59B6',
  '#1ABC9C',
  '#3498DB',
];

const DEFAULT_NOTICE =
  '以上站点仅做参考，部分站点可能有调整未登记，请知悉。(Note: Stations are for reference only and may be subject to change.)';

function hasCoord(row: ShuttleScheduleStopRow): boolean {
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function formatTimes(times: string[] | undefined): string {
  return (times ?? []).filter(Boolean).join(' / ');
}

function splitRouteName(name: string, id: number | string): { id: string; displayName: string } {
  const trimmed = name.trim();
  const match = /^([A-Za-z]\d+)\s*(.*)$/.exec(trimmed);
  if (match) {
    return { id: match[1].toUpperCase(), displayName: match[2]?.trim() || trimmed };
  }
  return { id: String(id), displayName: trimmed };
}

function mapStopLine(stop: ShuttleScheduleStopRow): string {
  const place = stop.stop_name?.trim() || '';
  const times = formatTimes(stop.times);
  if (times && place) {
    return `${times} ${place}`;
  }
  return place || times;
}

export function mapScheduleRoute(row: ShuttleScheduleRouteRow): ShuttleRoute {
  const stops = [...(row.stops ?? [])].sort((a, b) => a.sequence - b.sequence);
  const { id, displayName } = splitRouteName(row.name, row.id);
  const shuttleStops: ShuttleStop[] = stops.map((stop) => {
    const times = formatTimes(stop.times);
    const firstTime = (stop.times ?? []).find(Boolean) || times.split('/')[0]?.trim();
    return {
      time: firstTime || undefined,
      name: stop.stop_name?.trim() || '',
      note: stop.address?.trim() || undefined,
    };
  });
  const stopLines = stops.map(mapStopLine);
  return {
    id,
    name: displayName,
    stops: shuttleStops,
    stationsText: stopLines.join('\n'),
  };
}

function mapMapRoute(row: ShuttleScheduleRouteRow, index: number): ShuttleMapData['routes'][number] {
  const stops = [...(row.stops ?? [])]
    .filter(hasCoord)
    .sort((a, b) => a.sequence - b.sequence);
  const { id, displayName } = splitRouteName(row.name, row.id);
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length] ?? '#409EFF';
  const points = stops.map((stop) => ({
    latitude: Number(stop.latitude),
    longitude: Number(stop.longitude),
  }));
  const markers = stops.map((stop) => ({
    id: stop.stop,
    latitude: Number(stop.latitude),
    longitude: Number(stop.longitude),
    title: stop.stop_name?.trim() || '',
    sequence: stop.sequence,
    timesText: formatTimes(stop.times),
  }));
  return {
    id,
    name: displayName,
    color,
    points,
    markers,
  };
}

export function mapShuttleSchedulePayload(
  locationCode: string,
  locationLabel: string,
  routes: ShuttleScheduleRouteRow[],
): ShuttleData {
  const scheduleRoutes = routes.map(mapScheduleRoute);
  const mapRoutes = routes.map(mapMapRoute).filter((route) => route.points.length > 0);
  const center = MAP_CENTER[locationCode] ?? MAP_CENTER.suzhou;
  const map: ShuttleMapData | undefined = mapRoutes.length
    ? {
        title: `班车线路图 (Shuttle Map) · ${locationLabel}`,
        center,
        routes: mapRoutes,
      }
    : undefined;
  return {
    notice: DEFAULT_NOTICE,
    routes: scheduleRoutes,
    map,
  };
}
