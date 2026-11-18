import path from 'node:path';
import type { CampusMapData, ImageResource } from '@app/shared';
import { logInfo, logWarn } from '../utils/logger';
import { livePageBudgetMs, raceWithBudget } from './live-api-timeout';
import { campusCodeFromLocation } from './lunch-menu.service';
import { fetchCampusMapFiles, isCampusMapApiEnabled, type CampusMapFileRow } from './campus-map.client';
import { cacheCampusMapPdfFromUrl } from './campus-map.pdf-cache';
import { buildCampusMapFromPdfFile, getFixtures } from './fixture.service';

export const CAMPUS_MAP_SYNC_TTL_MS = 5 * 60_000;
const CAMPUS_MAP_FAILURE_TTL_MS = 30_000;

const CAMPUS_MAP_IMAGE_NAME = /\.(png|jpe?g|webp|gif)(\?|$)/i;

type CacheEntry = {
  at: number;
  data: CampusMapData | null;
  ok: boolean;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CampusMapData | null>>();

function cacheTtl(entry: CacheEntry): number {
  return entry.ok ? CAMPUS_MAP_SYNC_TTL_MS : CAMPUS_MAP_FAILURE_TTL_MS;
}

function rowAssetName(row: CampusMapFileRow): string {
  return (row.file_name || row.object_key?.split('/').pop() || row.url || '').toLowerCase();
}

function rowModifiedMs(row: CampusMapFileRow): number {
  if (!row.last_modified) {
    return 0;
  }
  const ms = Date.parse(row.last_modified);
  return Number.isFinite(ms) ? ms : 0;
}

function pickLatestMapFileRow(rows: CampusMapFileRow[]): { kind: 'pdf' | 'image'; row: CampusMapFileRow } | null {
  const eligible = rows.filter((row) => {
    if (!row.url) {
      return false;
    }
    const name = rowAssetName(row);
    return name.endsWith('.pdf') || CAMPUS_MAP_IMAGE_NAME.test(name);
  });
  if (!eligible.length) {
    return null;
  }
  const sorted = [...eligible].sort((a, b) => rowModifiedMs(b) - rowModifiedMs(a));
  const row = sorted[0];
  if (!row) {
    return null;
  }
  const name = rowAssetName(row);
  return { kind: name.endsWith('.pdf') ? 'pdf' : 'image', row };
}

function buildCampusMapFromLiveImage(
  location: string,
  fixtureBase: Pick<CampusMapData, 'title' | 'image'>,
  row: CampusMapFileRow,
): CampusMapData {
  const alt = fixtureBase.image.alt || fixtureBase.title;
  const cover: ImageResource = {
    url: row.url ?? fixtureBase.image.url,
    alt,
    width: fixtureBase.image.width,
    height: fixtureBase.image.height,
    aspectRatio: fixtureBase.image.aspectRatio,
  };
  return {
    title: fixtureBase.title,
    image: cover,
    pages: [
      {
        id: `${location}-live-map`,
        type: 'sheet',
        title: 'MAP',
        coverImage: cover,
      },
    ],
  };
}

async function fetchLiveCampusMap(location: string, campus: string): Promise<CampusMapData | null> {
  const fixtureBase = getFixtures().campusMapByLocation[location];
  if (!fixtureBase) {
    return null;
  }
  const rows = await fetchCampusMapFiles(campus);
  const picked = pickLatestMapFileRow(rows);
  if (!picked) {
    return null;
  }
  if (picked.kind === 'image') {
    const data = buildCampusMapFromLiveImage(location, fixtureBase, picked.row);
    logInfo('Loaded campus map image from management API', {
      location,
      fileName: rowAssetName(picked.row),
    });
    return data;
  }
  const row = picked.row;
  const fileName = (row.file_name || row.object_key?.split('/').pop() || 'campus-map.pdf').trim();
  const pdfAbsolute = await cacheCampusMapPdfFromUrl(location, fileName, row.url!);
  if (!pdfAbsolute) {
    return null;
  }
  const data = buildCampusMapFromPdfFile(
    location,
    { title: fixtureBase.title, image: fixtureBase.image },
    pdfAbsolute,
    path.basename(pdfAbsolute),
  );
  logInfo('Loaded campus map from management API', { location, fileName: path.basename(pdfAbsolute) });
  return data;
}

export async function loadLiveCampusMap(location: string): Promise<CampusMapData | null> {
  if (!isCampusMapApiEnabled()) {
    return null;
  }
  const campus = campusCodeFromLocation(location);
  const cached = cache.get(location);
  if (cached && Date.now() - cached.at < cacheTtl(cached)) {
    return cached.data;
  }
  const pending = inFlight.get(location);
  if (pending) {
    return cached?.data ?? raceWithBudget(pending, null, livePageBudgetMs());
  }
  const run = (async () => {
    try {
      const data = await fetchLiveCampusMap(location, campus);
      cache.set(location, { at: Date.now(), data, ok: true });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Campus map load failed', { location, message });
      cache.set(location, { at: Date.now(), data: cached?.data ?? null, ok: false });
      return cached?.data ?? null;
    } finally {
      inFlight.delete(location);
    }
  })();
  inFlight.set(location, run);
  if (cached?.data) {
    return cached.data;
  }
  return raceWithBudget(run, null, livePageBudgetMs());
}