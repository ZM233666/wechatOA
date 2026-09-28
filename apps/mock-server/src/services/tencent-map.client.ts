import crypto from 'node:crypto';
import { mockEnv } from '../config/env';
import {
  buildAddressAttempts,
  pickBestGeocodeCandidate,
  regionShort,
  resolveRouteDurationSeconds,
  type GeocodeCandidate,
  type GeocodeRankBias,
} from './shuttle-trip-plan.utils';

type LatLng = { latitude: number; longitude: number };

type TencentEnvelope<T> = {
  status: number;
  message?: string;
  result?: T;
  data?: Array<{ title?: string; address?: string; location?: { lat: number; lng: number } }>;
};

type GeocodeResult = {
  title?: string;
  location?: { lat: number; lng: number };
};

type DirectionStep = {
  duration?: number;
  instruction?: string;
  mode?: string;
  lines?: Array<{ title?: string }>;
};

type DirectionRoute = {
  duration?: number;
  distance?: number;
  steps?: DirectionStep[];
};

type DirectionResult = {
  routes?: DirectionRoute[];
};

const MODE_PATH: Record<'walking' | 'bicycling' | 'transit', string> = {
  walking: 'walking',
  bicycling: 'bicycling',
  transit: 'transit',
};

export type GeocodeBias = GeocodeRankBias;

function shouldSignRequests(): boolean {
  return mockEnv.TENCENT_MAP_USE_SN && Boolean(mockEnv.TENCENT_MAP_SK?.trim());
}

function toPoint(point: LatLng): string {
  return `${point.latitude},${point.longitude}`;
}

function wsPath(apiPath: string): string {
  const trimmed = apiPath.replace(/\/+$/, '');
  return trimmed.startsWith('/ws/') ? trimmed : `/ws/${trimmed.replace(/^\//, '')}`;
}

function signTencentGet(path: string, params: Record<string, string>): string {
  const sk = mockEnv.TENCENT_MAP_SK?.trim();
  if (!sk) {
    return '';
  }
  const query = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join('&');
  const raw = `${wsPath(path)}?${query}${sk}`;
  return crypto.createHash('md5').update(raw, 'utf8').digest('hex');
}

async function tencentRequest<T>(
  path: string,
  params: Record<string, string>,
  sign: boolean,
): Promise<TencentEnvelope<T>> {
  const key = mockEnv.TENCENT_MAP_KEY?.trim();
  if (!key) {
    throw new Error('Tencent Map key is not configured');
  }
  const signedParams = { ...params, key };
  const url = new URL(`https://apis.map.qq.com/ws/${path}`);
  Object.entries(signedParams).forEach(([name, value]) => {
    url.searchParams.set(name, value);
  });
  if (sign) {
    const sig = signTencentGet(path, signedParams);
    if (sig) {
      url.searchParams.set('sig', sig);
    }
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Tencent Map HTTP ${response.status}`);
  }
  return (await response.json()) as TencentEnvelope<T>;
}

async function tencentCall<T>(path: string, params: Record<string, string>): Promise<TencentEnvelope<T>> {
  const trySign = shouldSignRequests();
  let payload = await tencentRequest<T>(path, params, trySign);
  if (payload.status !== 0 && trySign && isParameterError(payload)) {
    payload = await tencentRequest<T>(path, params, false);
  }
  if (payload.status !== 0) {
    throw new Error(payload.message || `Tencent Map status ${payload.status}`);
  }
  return payload;
}

async function tencentGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const payload = await tencentCall<T>(path, params);
  if (payload.result === undefined || payload.result === null) {
    throw new Error('Tencent Map returned empty result');
  }
  return payload.result as T;
}

function isParameterError(payload: TencentEnvelope<unknown>): boolean {
  const message = payload.message ?? '';
  return payload.status === 348 || message.includes('参数');
}

function locationFromResult(
  title: string | undefined,
  location: { lat?: number; lng?: number } | undefined,
  fallbackName: string,
): GeocodeCandidate | null {
  const lat = location?.lat;
  const lng = location?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    name: title?.trim() || fallbackName,
    latitude: lat as number,
    longitude: lng as number,
  };
}

async function geocodeOnce(address: string, region?: string): Promise<GeocodeResult> {
  const city = regionShort(region);
  return tencentGet<GeocodeResult>('geocoder/v1/', {
    address,
    ...(city ? { region: city } : {}),
  });
}

async function searchPlaces(keyword: string, bias?: GeocodeBias) {
  const city = regionShort(bias?.region) ?? '苏州';
  const params: Record<string, string> = {
    keyword,
    page_size: '10',
    page_index: '1',
  };
  if (bias?.anchor) {
    params.boundary = `near(${bias.anchor.latitude},${bias.anchor.longitude},40000,1)`;
  } else {
    params.boundary = `region(${city},0)`;
  }
  const payload = await tencentCall<unknown>('place/v1/search', params);
  return payload.data ?? [];
}

export async function geocodeAddress(
  address: string,
  bias?: GeocodeBias,
): Promise<{ name: string; latitude: number; longitude: number }> {
  const trimmed = address.trim();
  const region = bias?.region;
  const candidates: GeocodeCandidate[] = [];

  for (const query of buildAddressAttempts(trimmed, region)) {
    try {
      const result = await geocodeOnce(query, region);
      const resolved = locationFromResult(result.title, result.location, query);
      if (resolved) {
        candidates.push(resolved);
      }
    } catch {
      // try next address variant
    }
  }

  try {
    const places = await searchPlaces(trimmed, bias);
    places.forEach((place) => {
      const label = [place.title, place.address].filter(Boolean).join(' · ');
      const resolved = locationFromResult(label, place.location, trimmed);
      if (resolved) {
        candidates.push(resolved);
      }
    });
  } catch {
    // optional fallback
  }

  const best = pickBestGeocodeCandidate(trimmed, candidates, bias);
  if (best) {
    return best;
  }

  throw new Error('未找到匹配地点，请换「城市+地址」或地图选点');
}

export async function fetchDirectionPlan(
  mode: 'walking' | 'bicycling' | 'transit',
  from: LatLng,
  to: LatLng,
): Promise<{ durationSeconds: number; distanceMeters: number; summaryHint: string }> {
  const params: Record<string, string> = {
    from: toPoint(from),
    to: toPoint(to),
  };
  if (mode === 'transit') {
    params.policy = 'LEAST_TIME';
  }
  const result = await tencentGet<DirectionResult>(`direction/v1/${MODE_PATH[mode]}/`, params);
  const route = result.routes?.[0];
  if (!route) {
    throw new Error('No route returned');
  }
  const distanceMeters = Number(route.distance ?? 0);
  const durationSeconds = resolveRouteDurationSeconds(route, distanceMeters, mode);
  const summaryHint = summarizeDirectionSteps(route.steps ?? [], mode);
  return { durationSeconds, distanceMeters, summaryHint };
}

function summarizeDirectionSteps(steps: DirectionStep[], mode: 'walking' | 'bicycling' | 'transit'): string {
  if (!steps.length) {
    return '';
  }
  if (mode === 'transit') {
    const lineNames = new Set<string>();
    steps.forEach((step) => {
      step.lines?.forEach((line) => {
        const title = line.title?.trim();
        if (title) {
          lineNames.add(title);
        }
      });
    });
    if (lineNames.size > 0) {
      return [...lineNames].slice(0, 3).join(' → ');
    }
    const transitStep = steps.find((step) => step.mode === 'TRANSIT' || step.mode === 'SUBWAY');
    return transitStep?.instruction?.trim() || steps[0]?.instruction?.trim() || '';
  }
  return steps[0]?.instruction?.trim() || '';
}
