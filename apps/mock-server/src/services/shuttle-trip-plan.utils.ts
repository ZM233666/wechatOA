import type { ShuttleMapData } from '@app/shared';

export interface ShuttleStopIndexItem {
  stopId: number;
  stopName: string;
  timesText: string;
  latitude: number;
  longitude: number;
  shuttleLineNames: string[];
}

function collectTimeTokens(raw: string | undefined, bucket: Set<string>): void {
  if (!raw?.trim()) {
    return;
  }
  raw
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((token) => bucket.add(token));
}

export function mergeShuttleStopTimes(parts: string[]): string {
  const tokens = new Set<string>();
  parts.forEach((part) => collectTimeTokens(part, tokens));
  return [...tokens].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).join(' / ');
}

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function coordKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

export function collectShuttleStops(map: ShuttleMapData | undefined): ShuttleStopIndexItem[] {
  if (!map?.routes?.length) {
    return [];
  }
  const byKey = new Map<string, ShuttleStopIndexItem & { timesParts: string[] }>();
  map.routes.forEach((route) => {
    const lineLabel = route.name?.trim() || route.id;
    route.markers.forEach((marker) => {
      const key = coordKey(marker.latitude, marker.longitude);
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.shuttleLineNames.includes(lineLabel)) {
          existing.shuttleLineNames.push(lineLabel);
        }
        if (marker.timesText?.trim()) {
          existing.timesParts.push(marker.timesText);
        }
        return;
      }
      byKey.set(key, {
        stopId: marker.id,
        stopName: marker.title,
        timesText: '',
        timesParts: marker.timesText?.trim() ? [marker.timesText] : [],
        latitude: marker.latitude,
        longitude: marker.longitude,
        shuttleLineNames: [lineLabel],
      });
    });
  });
  return [...byKey.values()].map(({ timesParts, ...stop }) => ({
    ...stop,
    timesText: mergeShuttleStopTimes(timesParts),
  }));
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} 公里`;
  }
  return `${Math.round(meters)} 米`;
}

export function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `约 ${hours} 小时 ${rest} 分钟` : `约 ${hours} 小时`;
  }
  return `约 ${Math.max(1, minutes)} 分钟`;
}

export function parseLatLngPair(input: string): { latitude: number; longitude: number } | null {
  const match = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(input.trim());
  if (!match) {
    return null;
  }
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

export interface GeocodeCandidate {
  name: string;
  latitude: number;
  longitude: number;
}

export interface GeocodeRankBias {
  region?: string;
  anchor?: { latitude: number; longitude: number };
  maxRadiusMeters?: number;
}

const DEFAULT_GEOCODE_BIAS_RADIUS_M = 45_000;

export function regionShort(region?: string): string | undefined {
  if (!region?.trim()) {
    return undefined;
  }
  return region.replace(/市$/u, '').trim();
}

function regionFull(region?: string): string | undefined {
  if (!region?.trim()) {
    return undefined;
  }
  const trimmed = region.trim();
  return trimmed.endsWith('市') ? trimmed : `${trimmed}市`;
}

export function buildAddressAttempts(keyword: string, region?: string): string[] {
  const trimmed = keyword.trim();
  const full = regionFull(region);
  const short = regionShort(region);
  const ordered = new Set<string>();
  if (full) {
    ordered.add(`${full}${trimmed}`);
  }
  if (short) {
    ordered.add(`${short}${trimmed}`);
  }
  ordered.add(trimmed);
  return [...ordered];
}

function keywordScore(keyword: string, ...texts: Array<string | undefined>): number {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return 0;
  }
  let score = 0;
  texts.forEach((text) => {
    const raw = text?.trim().toLowerCase();
    if (!raw) {
      return;
    }
    if (raw === normalized) {
      score += 100;
    } else if (raw.includes(normalized)) {
      score += 40;
    } else if (normalized.includes(raw)) {
      score += 20;
    }
  });
  return score;
}

export function pickBestGeocodeCandidate(
  keyword: string,
  candidates: GeocodeCandidate[],
  bias?: GeocodeRankBias,
): GeocodeCandidate | null {
  if (candidates.length === 0) {
    return null;
  }
  const anchor = bias?.anchor;
  const maxRadius = bias?.maxRadiusMeters ?? DEFAULT_GEOCODE_BIAS_RADIUS_M;
  const ranked = candidates
    .map((item) => {
      const distanceToAnchor = anchor
        ? haversineMeters(anchor, { latitude: item.latitude, longitude: item.longitude })
        : 0;
      const textScore = keywordScore(keyword, item.name);
      const inRadius = !anchor || distanceToAnchor <= maxRadius;
      const distancePenalty = anchor ? distanceToAnchor / 1000 : 0;
      const total = textScore + (inRadius ? 50 : 0) - distancePenalty;
      return { item, total, inRadius };
    })
    .sort((a, b) => b.total - a.total);
  const preferred = ranked.find((row) => row.inRadius) ?? ranked[0];
  return preferred?.item ?? null;
}

const MODE_SPEED_MPS: Record<'walking' | 'bicycling' | 'transit', number> = {
  walking: 1.35,
  bicycling: 4.2,
  transit: 6.5,
};

const MODE_SPEED_RANGE: Record<'walking' | 'bicycling' | 'transit', [number, number]> = {
  walking: [0.6, 2.2],
  bicycling: [2, 7],
  transit: [2, 25],
};

function estimateDirectionDurationSeconds(
  distanceMeters: number,
  mode: 'walking' | 'bicycling' | 'transit',
): number {
  const safeDistance = Math.max(distanceMeters, 1);
  return Math.max(60, safeDistance / MODE_SPEED_MPS[mode]);
}

export function resolveRouteDurationSeconds(
  route: { duration?: number; steps?: Array<{ duration?: number }> },
  distanceMeters: number,
  mode: 'walking' | 'bicycling' | 'transit',
): number {
  const safeDistance = Math.max(distanceMeters, 1);
  const routeDuration = Number(route.duration ?? 0);
  const stepDuration = (route.steps ?? []).reduce(
    (sum, step) => sum + Number(step.duration ?? 0),
    0,
  );
  const raw = routeDuration > 0 ? routeDuration : stepDuration;

  if (!Number.isFinite(raw) || raw <= 0) {
    return estimateDirectionDurationSeconds(safeDistance, mode);
  }

  const isPlausible = (seconds: number): boolean => {
    const mps = safeDistance / seconds;
    const [lo, hi] = MODE_SPEED_RANGE[mode];
    return mps >= lo && mps <= hi;
  };

  const asSeconds = raw;
  const asMinutes = raw * 60;
  if (isPlausible(asSeconds)) {
    return asSeconds;
  }
  if (isPlausible(asMinutes)) {
    return asMinutes;
  }
  if (raw < 180 && safeDistance > 400) {
    return raw * 60;
  }
  return estimateDirectionDurationSeconds(safeDistance, mode);
}
