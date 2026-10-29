import { normalizeMarkerColor, resolveShuttleMarkerIcons } from './shuttle-marker-icon';

export interface ShuttleMapMarkerView {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  iconPath: string;
  width: number;
  height: number;
  anchor: { x: number; y: number };
  routeName: string;
  stopName: string;
  timesText: string;
}

export interface ShuttleMapPolylineView {
  points: Array<{ latitude: number; longitude: number }>;
  color: string;
  width: number;
  arrowLine: boolean;
}

export interface ShuttleMapRouteLine {
  id: string;
  name: string;
  color: string;
  points: Array<{ latitude: number; longitude: number }>;
  markers: Array<{
    id: number;
    latitude: number;
    longitude: number;
    title: string;
    sequence: number;
    timesText: string;
  }>;
}

export interface ShuttleMapLegendItem {
  id: string;
  name: string;
  color: string;
}

export interface ShuttleMapStopDetail {
  routeName: string;
  stopName: string;
  timesText: string;
}

export interface ShuttleMapViewModel {
  center: { latitude: number; longitude: number };
  scale: number;
  markers: ShuttleMapMarkerView[];
  polyline: ShuttleMapPolylineView[];
  legend: ShuttleMapLegendItem[];
}

function hexColor(color: string): string {
  const raw = color.trim();
  if (/^#[0-9A-Fa-f]{8}$/.test(raw)) {
    return raw;
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) {
    return `${raw}FF`;
  }
  return '#409EFFFF';
}

export async function buildShuttleMapView(
  routes: ShuttleMapRouteLine[],
  selectedRouteId: string,
  center: { latitude: number; longitude: number },
): Promise<ShuttleMapViewModel> {
  const active =
    selectedRouteId === 'all'
      ? routes
      : routes.filter((route) => route.id === selectedRouteId);
  const iconByColor = await resolveShuttleMarkerIcons(active.map((route) => route.color));
  const markers: ShuttleMapMarkerView[] = [];
  const polyline: ShuttleMapPolylineView[] = [];
  let markerSeq = 1;

  active.forEach((route) => {
    if (route.points.length >= 2) {
      polyline.push({
        points: route.points,
        color: hexColor(route.color),
        width: 4,
        arrowLine: true,
      });
    }
    const iconPath =
      iconByColor.get(normalizeMarkerColor(route.color)) ?? iconByColor.values().next().value;
    if (!iconPath) {
      return;
    }
    route.markers.forEach((stop) => {
      const markerId = markerSeq;
      const timesText = stop.timesText || '—';
      markers.push({
        id: markerId,
        latitude: stop.latitude,
        longitude: stop.longitude,
        title: stop.title,
        iconPath,
        width: 22,
        height: 22,
        anchor: { x: 0.5, y: 0.5 },
        routeName: route.name,
        stopName: stop.title,
        timesText,
      });
      markerSeq += 1;
    });
  });

  const legend = active.map((route) => ({
    id: route.id,
    name: route.name,
    color: normalizeMarkerColor(route.color),
  }));

  return {
    center,
    scale: 12,
    markers,
    polyline,
    legend,
  };
}
