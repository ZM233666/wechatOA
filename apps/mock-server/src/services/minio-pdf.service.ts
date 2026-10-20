import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Client as MinioClient } from 'minio';
import { mockEnv } from '../config/env';
import { logInfo, logWarn } from '../utils/logger';

const ROOT = path.resolve(__dirname, '../../');
const DEFAULT_SYNC_TTL_MS = 30_000;

export type MinioPdfCatalogId =
  | 'insights'
  | 'wetalk'
  | 'suzhou-campus-map'
  | 'suzhou-shuttle-bus'
  | 'employee-handbook'
  | 'financial-handbook';

type CatalogConfig = {
  id: MinioPdfCatalogId;
  label: string;
  cacheDir: string;
  localDir: string;
  getPrefix: () => string;
};

type MinioObjectMeta = {
  objectName: string;
  fileName: string;
  size: number;
  lastModifiedMs: number;
};

type SyncState = {
  lastAttemptMs: number;
  lastSuccessMs: number;
  inFlight: Promise<number> | null;
  lastError?: string;
};

export const INSIGHT_MINIO_CACHE_DIR = path.join(ROOT, 'runtime/minio/kb-insights');
export const INSIGHT_LOCAL_PDF_DIR = path.join(ROOT, 'fixtures/services/insights/files');
export const WETALK_MINIO_CACHE_DIR = path.join(ROOT, 'runtime/minio/wetalk');
export const WETALK_LOCAL_PDF_DIR = path.join(ROOT, 'fixtures/kb-life/wetalk/files');
export const SUZHOU_CAMPUS_MAP_MINIO_CACHE_DIR = path.join(ROOT, 'runtime/minio/suzhou/campus-map');
export const SUZHOU_CAMPUS_MAP_LOCAL_PDF_DIR = path.join(
  ROOT,
  'fixtures/kb-life/locations/Suzhou/Map',
);
export const SUZHOU_SHUTTLE_BUS_MINIO_CACHE_DIR = path.join(ROOT, 'runtime/minio/suzhou/shuttle-bus');
export const SUZHOU_SHUTTLE_BUS_LOCAL_PDF_DIR = path.join(ROOT, 'fixtures/kb-life/Shuttlebus');
export const EMPLOYEE_HANDBOOK_MINIO_CACHE_DIR = path.join(ROOT, 'runtime/minio/employee-handbook');
export const EMPLOYEE_HANDBOOK_LOCAL_PDF_DIR = path.join(ROOT, 'fixtures/kb-life/handbook/files');
export const FINANCIAL_HANDBOOK_MINIO_CACHE_DIR = path.join(ROOT, 'runtime/minio/financial-handbook');
export const FINANCIAL_HANDBOOK_LOCAL_PDF_DIR = path.join(
  ROOT,
  'fixtures/kb-life/finance-handbook/files',
);

/** 仅苏州走 MinIO；其他地点保持本地 fixtures */
export const SUZHOU_MINIO_LOCATION = 'Suzhou';

const CATALOGS: Record<MinioPdfCatalogId, CatalogConfig> = {
  insights: {
    id: 'insights',
    label: 'KB Insights',
    cacheDir: INSIGHT_MINIO_CACHE_DIR,
    localDir: INSIGHT_LOCAL_PDF_DIR,
    getPrefix: () => mockEnv.MINIO_INSIGHTS_PREFIX,
  },
  wetalk: {
    id: 'wetalk',
    label: 'WeTalk',
    cacheDir: WETALK_MINIO_CACHE_DIR,
    localDir: WETALK_LOCAL_PDF_DIR,
    getPrefix: () => mockEnv.MINIO_WETALK_PREFIX,
  },
  'suzhou-campus-map': {
    id: 'suzhou-campus-map',
    label: 'Suzhou Campus Map',
    cacheDir: SUZHOU_CAMPUS_MAP_MINIO_CACHE_DIR,
    localDir: SUZHOU_CAMPUS_MAP_LOCAL_PDF_DIR,
    getPrefix: () => mockEnv.MINIO_SUZHOU_CAMPUS_MAP_PREFIX,
  },
  'suzhou-shuttle-bus': {
    id: 'suzhou-shuttle-bus',
    label: 'Suzhou Shuttle Bus',
    cacheDir: SUZHOU_SHUTTLE_BUS_MINIO_CACHE_DIR,
    localDir: SUZHOU_SHUTTLE_BUS_LOCAL_PDF_DIR,
    getPrefix: () => mockEnv.MINIO_SUZHOU_SHUTTLE_BUS_PREFIX,
  },
  'employee-handbook': {
    id: 'employee-handbook',
    label: 'Employee Handbook',
    cacheDir: EMPLOYEE_HANDBOOK_MINIO_CACHE_DIR,
    localDir: EMPLOYEE_HANDBOOK_LOCAL_PDF_DIR,
    getPrefix: () => mockEnv.MINIO_EMPLOYEE_HANDBOOK_PREFIX,
  },
  'financial-handbook': {
    id: 'financial-handbook',
    label: 'Financial Handbook',
    cacheDir: FINANCIAL_HANDBOOK_MINIO_CACHE_DIR,
    localDir: FINANCIAL_HANDBOOK_LOCAL_PDF_DIR,
    getPrefix: () => mockEnv.MINIO_FINANCIAL_HANDBOOK_PREFIX,
  },
};

const ALL_CATALOG_IDS = Object.keys(CATALOGS) as MinioPdfCatalogId[];

const syncStateByCatalog: Record<MinioPdfCatalogId, SyncState> = {
  insights: { lastAttemptMs: 0, lastSuccessMs: 0, inFlight: null },
  wetalk: { lastAttemptMs: 0, lastSuccessMs: 0, inFlight: null },
  'suzhou-campus-map': { lastAttemptMs: 0, lastSuccessMs: 0, inFlight: null },
  'suzhou-shuttle-bus': { lastAttemptMs: 0, lastSuccessMs: 0, inFlight: null },
  'employee-handbook': { lastAttemptMs: 0, lastSuccessMs: 0, inFlight: null },
  'financial-handbook': { lastAttemptMs: 0, lastSuccessMs: 0, inFlight: null },
};

function normalizePrefix(prefix: string): string {
  const trimmed = prefix.replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed ? `${trimmed}/` : '';
}

export function isMinioPdfEnabled(): boolean {
  return mockEnv.MINIO_ENABLED && mockEnv.NODE_ENV !== 'test';
}

/** @deprecated 使用 isMinioPdfEnabled */
export const isInsightMinioEnabled = isMinioPdfEnabled;

function createClient(): MinioClient {
  return new MinioClient({
    endPoint: mockEnv.MINIO_ENDPOINT,
    port: mockEnv.MINIO_PORT,
    useSSL: mockEnv.MINIO_USE_SSL,
    accessKey: mockEnv.MINIO_ACCESS_KEY,
    secretKey: mockEnv.MINIO_SECRET_KEY,
  });
}

function listPdfFilesInDir(absoluteDir: string): Array<{ fileName: string; mtimeMs: number }> {
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }
  const items: Array<{ fileName: string; mtimeMs: number }> = [];

  function walk(currentDir: string, relativePrefix: string): void {
    for (const name of fs.readdirSync(currentDir)) {
      if (name.startsWith('.')) {
        continue;
      }
      const absolute = path.join(currentDir, name);
      const stat = fs.statSync(absolute);
      const relativePath = relativePrefix ? `${relativePrefix}/${name}` : name;
      if (stat.isDirectory()) {
        walk(absolute, relativePath);
        continue;
      }
      if (!name.toLowerCase().endsWith('.pdf')) {
        continue;
      }
      items.push({
        fileName: relativePath.replace(/\\/g, '/'),
        mtimeMs: stat.mtimeMs,
      });
    }
  }

  walk(absoluteDir, '');
  return items;
}

function listCatalogPdfFileNames(
  catalogId: MinioPdfCatalogId,
): Array<{ fileName: string; mtimeMs: number }> {
  const catalog = CATALOGS[catalogId];
  const items = isMinioPdfEnabled()
    ? listPdfFilesInDir(catalog.cacheDir)
    : listPdfFilesInDir(catalog.localDir);
  return items.sort(
    (a, b) => b.mtimeMs - a.mtimeMs || a.fileName.localeCompare(b.fileName),
  );
}

function resolveCatalogPdfAbsolute(catalogId: MinioPdfCatalogId, fileName: string): string | null {
  const catalog = CATALOGS[catalogId];
  const normalized = fileName.replace(/\\/g, '/');
  if (!normalized || normalized.includes('..')) {
    return null;
  }
  const segments = normalized.split('/').filter(Boolean);
  const minioPath = path.join(catalog.cacheDir, ...segments);
  if (fs.existsSync(minioPath)) {
    return minioPath;
  }
  const localPath = path.join(catalog.localDir, ...segments);
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  return null;
}

/** 声明名优先；否则名称含 preferred 子串；可选按 mtime 取最新（fallbackToLatest，默认 true） */
export function pickPreferredPdfFileName(
  files: Array<{ fileName: string; mtimeMs: number }>,
  options?: {
    declared?: string;
    preferredIncludes?: string[];
    /** 为 false 时，关键词未命中则不自动选「最新一份」（用于多分区共用同一 MinIO 前缀） */
    fallbackToLatest?: boolean;
  },
): string | null {
  if (!files.length) {
    return null;
  }
  if (options?.declared && files.some((item) => item.fileName === options.declared)) {
    return options.declared;
  }
  const needles = (options?.preferredIncludes ?? []).map((item) => item.toLowerCase());
  if (needles.length) {
    const preferred = files.find((item) => {
      const lower = item.fileName.toLowerCase();
      return needles.some((needle) => lower.includes(needle));
    });
    if (preferred) {
      return preferred.fileName;
    }
  }
  if (options?.fallbackToLatest === false) {
    return null;
  }
  return files[0]?.fileName ?? null;
}

export function listInsightPdfFileNames(): Array<{ fileName: string; mtimeMs: number }> {
  return listCatalogPdfFileNames('insights');
}

export function listWetalkPdfFileNames(): Array<{ fileName: string; mtimeMs: number }> {
  return listCatalogPdfFileNames('wetalk');
}

export function listSuzhouCampusMapPdfFileNames(): Array<{ fileName: string; mtimeMs: number }> {
  return listCatalogPdfFileNames('suzhou-campus-map');
}

export function listSuzhouShuttleBusPdfFileNames(): Array<{ fileName: string; mtimeMs: number }> {
  return listCatalogPdfFileNames('suzhou-shuttle-bus');
}

export function listEmployeeHandbookPdfFileNames(): Array<{ fileName: string; mtimeMs: number }> {
  return listCatalogPdfFileNames('employee-handbook');
}

export function resolveInsightPdfAbsolute(fileName: string): string | null {
  return resolveCatalogPdfAbsolute('insights', fileName);
}

export function resolveWetalkPdfAbsolute(fileName: string): string | null {
  return resolveCatalogPdfAbsolute('wetalk', fileName);
}

export function resolveSuzhouCampusMapPdfAbsolute(fileName: string): string | null {
  return resolveCatalogPdfAbsolute('suzhou-campus-map', fileName);
}

export function resolveSuzhouShuttleBusPdfAbsolute(fileName: string): string | null {
  return resolveCatalogPdfAbsolute('suzhou-shuttle-bus', fileName);
}

export function resolveEmployeeHandbookPdfAbsolute(fileName: string): string | null {
  return resolveCatalogPdfAbsolute('employee-handbook', fileName);
}

export function findSuzhouCampusMapPdfFileName(declared?: string): string | null {
  return pickPreferredPdfFileName(listSuzhouCampusMapPdfFileNames(), {
    declared,
    preferredIncludes: ['park-map'],
  });
}

export function findSuzhouCampusMapPdfAbsolute(declared?: string): string | null {
  const fileName = findSuzhouCampusMapPdfFileName(declared);
  return fileName ? resolveSuzhouCampusMapPdfAbsolute(fileName) : null;
}

export function findSuzhouShuttleBusPdfAbsolute(): string | null {
  const fileName = pickPreferredPdfFileName(listSuzhouShuttleBusPdfFileNames(), {
    preferredIncludes: ['shuttle'],
  });
  return fileName ? resolveSuzhouShuttleBusPdfAbsolute(fileName) : null;
}

export function findEmployeeHandbookPdfFileName(declared?: string): string | null {
  return pickPreferredPdfFileName(listEmployeeHandbookPdfFileNames(), {
    declared,
    preferredIncludes: ['handbook', 'employee', '员工手册'],
  });
}

export function listFinancialHandbookPdfFileNames(): Array<{ fileName: string; mtimeMs: number }> {
  return listCatalogPdfFileNames('financial-handbook');
}

export function resolveFinancialHandbookPdfAbsolute(fileName: string): string | null {
  return resolveCatalogPdfAbsolute('financial-handbook', fileName);
}

export function findFinancialHandbookPdfFileName(declared?: string): string | null {
  return pickPreferredPdfFileName(listFinancialHandbookPdfFileNames(), {
    declared,
    preferredIncludes: ['finance', 'financial', '财务'],
  });
}

async function listRemoteObjects(
  client: MinioClient,
  prefixRaw: string,
): Promise<MinioObjectMeta[]> {
  const prefix = normalizePrefix(prefixRaw);
  const items: MinioObjectMeta[] = [];

  await new Promise<void>((resolve, reject) => {
    const stream = client.listObjectsV2(mockEnv.MINIO_BUCKET, prefix, true);
    stream.on('data', (obj) => {
      if (!obj.name || obj.name.endsWith('/')) {
        return;
      }
      const relativePath = obj.name.slice(prefix.length).replace(/^\/+/, '');
      if (!relativePath.toLowerCase().endsWith('.pdf') || relativePath.startsWith('.')) {
        return;
      }
      if (relativePath.includes('..')) {
        return;
      }
      items.push({
        objectName: obj.name,
        fileName: relativePath,
        size: obj.size ?? 0,
        lastModifiedMs: obj.lastModified ? obj.lastModified.getTime() : Date.now(),
      });
    });
    stream.on('error', reject);
    stream.on('end', () => resolve());
  });

  return items.sort((a, b) => b.lastModifiedMs - a.lastModifiedMs);
}

function needsDownload(localPath: string, remote: MinioObjectMeta): boolean {
  if (!fs.existsSync(localPath)) {
    return true;
  }
  const stat = fs.statSync(localPath);
  if (stat.size !== remote.size) {
    return true;
  }
  if (stat.mtimeMs + 2000 < remote.lastModifiedMs) {
    return true;
  }
  return false;
}

async function downloadObject(
  client: MinioClient,
  remote: MinioObjectMeta,
  localPath: string,
): Promise<void> {
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  const tempPath = `${localPath}.part`;
  const stream = await client.getObject(mockEnv.MINIO_BUCKET, remote.objectName);
  await pipeline(stream, fs.createWriteStream(tempPath));
  fs.renameSync(tempPath, localPath);
  try {
    fs.utimesSync(localPath, new Date(), new Date(remote.lastModifiedMs));
  } catch {
    // ignore utimes failures on some FS
  }
}

export async function syncPdfCatalogFromMinio(
  catalogId: MinioPdfCatalogId,
  options?: { force?: boolean; ttlMs?: number },
): Promise<number> {
  if (!isMinioPdfEnabled()) {
    return 0;
  }

  const catalog = CATALOGS[catalogId];
  const syncState = syncStateByCatalog[catalogId];
  const ttlMs = options?.ttlMs ?? DEFAULT_SYNC_TTL_MS;
  const now = Date.now();

  if (!options?.force && syncState.inFlight) {
    return syncState.inFlight;
  }
  if (!options?.force && now - syncState.lastSuccessMs < ttlMs) {
    return listPdfFilesInDir(catalog.cacheDir).length;
  }

  const run = (async () => {
    syncState.lastAttemptMs = Date.now();
    try {
      const client = createClient();
      const remotes = await listRemoteObjects(client, catalog.getPrefix());
      fs.mkdirSync(catalog.cacheDir, { recursive: true });

      let downloaded = 0;
      for (const remote of remotes) {
        const localPath = path.join(
          catalog.cacheDir,
          ...remote.fileName.replace(/\\/g, '/').split('/').filter(Boolean),
        );
        if (!needsDownload(localPath, remote)) {
          continue;
        }
        await downloadObject(client, remote, localPath);
        downloaded += 1;
      }

      const remoteNames = new Set(remotes.map((item) => item.fileName));
      for (const local of listPdfFilesInDir(catalog.cacheDir)) {
        if (!remoteNames.has(local.fileName)) {
          fs.rmSync(
            path.join(catalog.cacheDir, ...local.fileName.split('/').filter(Boolean)),
            { force: true },
          );
        }
      }

      syncState.lastSuccessMs = Date.now();
      syncState.lastError = undefined;
      logInfo(`Synced ${catalog.label} PDFs from MinIO`, {
        bucket: mockEnv.MINIO_BUCKET,
        prefix: normalizePrefix(catalog.getPrefix()),
        total: remotes.length,
        downloaded,
      });
      return remotes.length;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      syncState.lastError = message;
      logWarn(`MinIO ${catalog.label} sync failed; using local cache/fixtures`, { message });
      return listPdfFilesInDir(catalog.cacheDir).length;
    } finally {
      syncState.inFlight = null;
    }
  })();

  syncState.inFlight = run;
  return run;
}

export async function syncInsightPdfsFromMinio(options?: {
  force?: boolean;
  ttlMs?: number;
}): Promise<number> {
  return syncPdfCatalogFromMinio('insights', options);
}

export async function syncWetalkPdfsFromMinio(options?: {
  force?: boolean;
  ttlMs?: number;
}): Promise<number> {
  return syncPdfCatalogFromMinio('wetalk', options);
}

export async function syncAllPdfCatalogsFromMinio(options?: {
  force?: boolean;
  ttlMs?: number;
}): Promise<Record<MinioPdfCatalogId, number>> {
  const entries = await Promise.all(
    ALL_CATALOG_IDS.map(async (id) => [id, await syncPdfCatalogFromMinio(id, options)] as const),
  );
  return Object.fromEntries(entries) as Record<MinioPdfCatalogId, number>;
}

export function refreshAllMinioPdfsInBackground(): void {
  if (!isMinioPdfEnabled()) {
    return;
  }
  for (const id of ALL_CATALOG_IDS) {
    void syncPdfCatalogFromMinio(id);
  }
}

export function refreshInsightMinioInBackground(): void {
  if (!isMinioPdfEnabled()) {
    return;
  }
  void syncPdfCatalogFromMinio('insights');
}

export function refreshWetalkMinioInBackground(): void {
  if (!isMinioPdfEnabled()) {
    return;
  }
  void syncPdfCatalogFromMinio('wetalk');
}

export function getMinioPdfStatus(catalogId: MinioPdfCatalogId): {
  enabled: boolean;
  cacheDir: string;
  lastSuccessMs: number;
  lastError?: string;
} {
  const catalog = CATALOGS[catalogId];
  const syncState = syncStateByCatalog[catalogId];
  return {
    enabled: isMinioPdfEnabled(),
    cacheDir: catalog.cacheDir,
    lastSuccessMs: syncState.lastSuccessMs,
    lastError: syncState.lastError,
  };
}

export function getInsightMinioStatus(): {
  enabled: boolean;
  cacheDir: string;
  lastSuccessMs: number;
  lastError?: string;
} {
  return getMinioPdfStatus('insights');
}

export function getWetalkMinioStatus(): {
  enabled: boolean;
  cacheDir: string;
  lastSuccessMs: number;
  lastError?: string;
} {
  return getMinioPdfStatus('wetalk');
}

export function getAllMinioPdfStatuses(): Array<{
  id: MinioPdfCatalogId;
  enabled: boolean;
  cacheDir: string;
  lastSuccessMs: number;
  lastError?: string;
}> {
  return ALL_CATALOG_IDS.map((id) => ({ id, ...getMinioPdfStatus(id) }));
}
