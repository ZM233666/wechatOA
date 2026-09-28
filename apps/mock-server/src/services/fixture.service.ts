import fs from 'node:fs';
import path from 'node:path';
import { z, type ZodType } from 'zod';
import type { AppConfig, ArticleDetail, CaseDetail, CaseSummary, CampusMapData, CanteenData, HolidayCalendarData, HomeData, InsightReport, NewsSummary, ProductCategoriesData, ProductDetail, ProductSummary, ProfileData, ServiceDetail, ServicesPageData, ShuttleData, WetalkIssue } from '@app/shared';
import { appConfigSchema, homeFileSchema } from '../schemas/home.schema';
import { brandOverviewFileSchema, type BrandOverview } from '../schemas/brand.schema';
import { newsArticleFixtureSchema, newsCategoriesSchema, type NewsArticleFixture } from '../schemas/news.schema';
import { caseCategorySchema, caseDetailSchema, caseSummarySchema } from '../schemas/case.schema';
import { productCategoriesFileSchema, productDetailSchema, productSummarySchema } from '../schemas/product.schema';
import { insightReportSchema, servicesFileSchema } from '../schemas/service.schema';
import {
  activitiesSchema,
  campusMapSchema,
  canteenSchema,
  holidayCalendarSchema,
  kbLifeEntriesSchema,
  shuttleSchema,
  wetalkIssueSchema,
} from '../schemas/kb-life.schema';
import { profileSchema } from '../schemas/profile.schema';
import { articleDetailSchema } from '../schemas/article.schema';
import { listPublicNews, selectHomeNews, toNewsSummary } from './news.service';
import {
  buildSyntheticInsight,
  buildSyntheticWetalk,
  pickLatestInsightCovers,
} from './pdf-catalog.service';
import {
  findSuzhouCampusMapPdfFileName,
  listInsightPdfFileNames,
  listWetalkPdfFileNames,
  refreshAllMinioPdfsInBackground,
  resolveInsightPdfAbsolute,
  resolveSuzhouCampusMapPdfAbsolute,
  resolveSuzhouShuttleBusPdfAbsolute,
  resolveWetalkPdfAbsolute,
  SUZHOU_MINIO_LOCATION,
} from './minio-pdf.service';
import { ensurePdfSheets, PdfSheetRenderError } from './pdf-sheet.service';
import {
  findShuttlePdfAbsolute,
  loadShuttleDataFromPdf,
  SHUTTLE_PDF_LOCATIONS,
  ShuttlePdfParseError,
} from './shuttle-pdf.service';
import { logError, logWarn } from '../utils/logger';

const ROOT = path.resolve(__dirname, '../../');
export const FIXTURES_DIR = path.join(ROOT, 'fixtures');
export const PUBLIC_DIR = path.join(ROOT, 'public');

export class FixtureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FixtureValidationError';
  }
}

function formatZodError(filePath: string, error: z.ZodError): string {
  const details = error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  return `Fixture 校验失败: ${filePath}\n${details}`;
}

export function readJsonFile<T>(relativePath: string, schema: ZodType<T>): T {
  const absolutePath = path.join(FIXTURES_DIR, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new FixtureValidationError(`Fixture 文件不存在: ${absolutePath}`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'JSON parse error';
    throw new FixtureValidationError(`Fixture JSON 无法解析: ${absolutePath}\n${message}`);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new FixtureValidationError(formatZodError(absolutePath, parsed.error));
  }
  return parsed.data;
}

function listJsonFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(FIXTURES_DIR, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    throw new FixtureValidationError(`Fixture 目录不存在: ${absoluteDir}`);
  }
  return fs
    .readdirSync(absoluteDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(relativeDir, name));
}

function loadCampusLocationResources(locations: string[]): {
  canteenByLocation: Record<string, CanteenData>;
  shuttleByLocation: Record<string, ShuttleData>;
  campusMapByLocation: Record<string, CampusMapData>;
  holidayByLocation: Record<string, HolidayCalendarData>;
} {
  const canteenByLocation: Record<string, CanteenData> = {};
  const shuttleByLocation: Record<string, ShuttleData> = {};
  const campusMapByLocation: Record<string, CampusMapData> = {};
  const holidayByLocation: Record<string, HolidayCalendarData> = {};

  locations.forEach((location) => {
    const base = `kb-life/locations/${location}`;
    canteenByLocation[location] = readJsonFile(`${base}/canteen.json`, canteenSchema);
    campusMapByLocation[location] = resolveCampusMap(
      location,
      readJsonFile(`${base}/campus-map.json`, campusMapSchema),
    );
    holidayByLocation[location] = readJsonFile(`${base}/holiday.json`, holidayCalendarSchema);

    if (SHUTTLE_PDF_LOCATIONS.has(location)) {
      try {
        const fromPdf = loadShuttleDataFromPdf();
        if (fromPdf) {
          shuttleByLocation[location] = fromPdf;
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logWarn(`Shuttle PDF unavailable for ${location}, fallback to JSON`, { message });
      }
    }
    shuttleByLocation[location] = readJsonFile(`${base}/shuttle.json`, shuttleSchema);
  });

  return { canteenByLocation, shuttleByLocation, campusMapByLocation, holidayByLocation };
}

export interface MockFixtureStore {
  appConfig: AppConfig;
  home: HomeData;
  newsCategories: Array<{ id: string; name: string }>;
  newsList: NewsSummary[];
  newsArticles: NewsArticleFixture[];
  brand: BrandOverview;
  brandArticles: ArticleDetail[];
  productCategories: ProductCategoriesData;
  products: ProductSummary[];
  productDetails: ProductDetail[];
  caseCategories: Array<{ id: string; name: string }>;
  cases: CaseSummary[];
  caseDetails: CaseDetail[];
  services: ServicesPageData & { details: ServiceDetail[] };
  kbLifeEntries: ReturnType<typeof kbLifeEntriesSchema.parse>;
  canteenByLocation: Record<string, CanteenData>;
  shuttleByLocation: Record<string, ShuttleData>;
  campusMapByLocation: Record<string, CampusMapData>;
  holidayByLocation: Record<string, HolidayCalendarData>;
  activities: ReturnType<typeof activitiesSchema.parse>;
  profileGuest: ProfileData;
  profileLoggedIn: ProfileData;
  profileCustomer: ProfileData;
  insightReports: InsightReport[];
  wetalkIssues: WetalkIssue[];
}

let store: MockFixtureStore | null = null;

export function loadFixtures(): MockFixtureStore {
  const appConfig = readJsonFile('app/config.json', appConfigSchema);
  const homeFile = readJsonFile('home/home.json', homeFileSchema);
  const newsCategories = readJsonFile('news/categories.json', newsCategoriesSchema);
  const newsArticles = listJsonFiles('news/articles').map((file) =>
    readJsonFile(file, newsArticleFixtureSchema),
  );
  const newsList = listPublicNews(newsArticles).map(toNewsSummary);
  const home: HomeData = {
    ...homeFile,
    latestNews: selectHomeNews(newsArticles),
  };
  const brand = readJsonFile('brand/overview.json', brandOverviewFileSchema);
  const brandArticleFiles = listJsonFiles('brand/articles');
  const brandArticles = brandArticleFiles.map((file) => readJsonFile(file, articleDetailSchema));
  const productCategories = readJsonFile('products/categories.json', productCategoriesFileSchema);
  const products = readJsonFile('products/list.json', z.array(productSummarySchema));
  const productDetails = listJsonFiles('products/details').map((file) =>
    readJsonFile(file, productDetailSchema),
  );
  const caseCategories = readJsonFile('cases/categories.json', z.array(caseCategorySchema));
  const cases = readJsonFile('cases/list.json', z.array(caseSummarySchema));
  const caseDetails = listJsonFiles('cases/details').map((file) => readJsonFile(file, caseDetailSchema));
  const servicesFile = readJsonFile('services/services.json', servicesFileSchema);
  const kbLifeEntries = readJsonFile('kb-life/entries.json', kbLifeEntriesSchema);
  const {
    canteenByLocation,
    shuttleByLocation,
    campusMapByLocation,
    holidayByLocation,
  } = loadCampusLocationResources(kbLifeEntries.locations);
  const activities = readJsonFile('kb-life/activities.json', activitiesSchema);
  const profileGuest = readJsonFile('profile/guest.json', profileSchema);
  const profileLoggedIn = readJsonFile('profile/logged-in.json', profileSchema);
  const profileCustomer = readJsonFile('profile/customer.json', profileSchema);
  const insightReports = listJsonFiles('services/insights').map((file) =>
    resolveInsightReport(file, readJsonFile(file, insightReportSchema)),
  );
  const wetalkIssues = listJsonFiles('kb-life/wetalk')
    .map((file) => resolveWetalkIssue(file, readJsonFile(file, wetalkIssueSchema)))
    .sort((a, b) => b.id.localeCompare(a.id));

  store = {
    appConfig,
    home,
    newsCategories,
    newsList,
    newsArticles,
    brand,
    brandArticles,
    productCategories,
    products,
    productDetails,
    caseCategories,
    cases,
    caseDetails,
    services: servicesFile,
    kbLifeEntries,
    canteenByLocation,
    shuttleByLocation,
    campusMapByLocation,
    holidayByLocation,
    activities,
    profileGuest,
    profileLoggedIn,
    profileCustomer,
    insightReports,
    wetalkIssues,
  };
  syncPdfDrivenCatalogs();
  return store;
}

export function getFixtures(): MockFixtureStore {
  if (!store) {
    store = loadFixtures();
  }
  return store;
}

/**
 * 扫描 Insight PDF（MinIO kb-insights 缓存 + 本地 files/）与 WeTalk files/*.pdf：
 * 无对应 JSON 的 PDF 自动进列表；已配置 pdfFile 的按磁盘重渲。
 * 列表 / 首页接口每次调用；MinIO 按 TTL 后台刷新。
 */
export function syncPdfDrivenCatalogs(): void {
  const fixtures = getFixtures();
  refreshAllMinioPdfsInBackground();

  const insightJsonFiles = listJsonFiles('services/insights');
  const insightFromJson = insightJsonFiles.map((file) => {
    const raw = readJsonFile(file, insightReportSchema);
    return { raw, resolved: resolveInsightReport(file, raw) };
  });
  const claimedInsightPdfs = new Set(
    insightFromJson.map((item) => item.raw.pdfFile).filter((name): name is string => Boolean(name)),
  );
  const insightIdSet = new Set(insightFromJson.map((item) => item.resolved.id));

  const orphanInsightPdfs = listInsightPdfFileNames().filter((item) => {
    if (claimedInsightPdfs.has(item.fileName)) {
      return false;
    }
    const id = item.fileName.replace(/\.pdf$/i, '');
    // ASCII 同名 JSON 已存在则不重复合成
    if (/^[A-Za-z0-9._-]+$/.test(id) && insightIdSet.has(id)) {
      return false;
    }
    return true;
  });

  const syntheticInsights = orphanInsightPdfs.map((item) => {
    const raw = insightReportSchema.parse(buildSyntheticInsight(item.fileName));
    return resolveInsightReport(`services/insights/${raw.id}.pdf-auto`, raw);
  });

  const insightMtimes = new Map(listInsightPdfFileNames().map((item) => [item.fileName, item.mtimeMs]));
  fixtures.insightReports = [...insightFromJson.map((item) => item.resolved), ...syntheticInsights].sort(
    (a, b) => {
      const score = (item: InsightReport): number => {
        if (!item.pdfUrl) {
          return 0;
        }
        const fileName = decodeURIComponent(item.pdfUrl.split('/').pop() || '');
        return insightMtimes.get(fileName) ?? 0;
      };
      return score(b) - score(a) || b.id.localeCompare(a.id);
    },
  );
  const servicesBaseline = readJsonFile('services/services.json', servicesFileSchema);
  fixtures.services.insightCovers = pickLatestInsightCovers(
    fixtures.insightReports,
    servicesBaseline.insightCovers,
    2,
  );

  const wetalkJsonFiles = listJsonFiles('kb-life/wetalk');
  const wetalkFromJson = wetalkJsonFiles.map((file) => {
    const raw = readJsonFile(file, wetalkIssueSchema);
    return { raw, resolved: resolveWetalkIssue(file, raw) };
  });
  const claimedWetalkPdfs = new Set(
    wetalkFromJson.map((item) => item.raw.pdfFile).filter((name): name is string => Boolean(name)),
  );
  const wetalkIdSet = new Set(wetalkFromJson.map((item) => item.resolved.id));

  const orphanWetalkPdfs = listWetalkPdfFileNames().filter((item) => {
    if (claimedWetalkPdfs.has(item.fileName)) {
      return false;
    }
    const id = item.fileName.replace(/\.pdf$/i, '');
    if (/^[A-Za-z0-9._-]+$/.test(id) && wetalkIdSet.has(id)) {
      return false;
    }
    return true;
  });

  const syntheticWetalk = orphanWetalkPdfs.map((item) => {
    const raw = wetalkIssueSchema.parse(buildSyntheticWetalk(item.fileName));
    return resolveWetalkIssue(`kb-life/wetalk/${raw.id}.pdf-auto`, raw);
  });

  const wetalkMtimes = new Map(listWetalkPdfFileNames().map((item) => [item.fileName, item.mtimeMs]));
  fixtures.wetalkIssues = [...wetalkFromJson.map((item) => item.resolved), ...syntheticWetalk].sort(
    (a, b) => {
      const score = (item: WetalkIssue): number => {
        if (!item.pdfUrl) {
          return 0;
        }
        const fileName = decodeURIComponent(item.pdfUrl.split('/').pop() || '');
        return wetalkMtimes.get(fileName) ?? 0;
      };
      return score(b) - score(a) || b.id.localeCompare(a.id);
    },
  );
}

/** 打开详情时同步目录并返回最新条目（含新建 PDF） */
export function refreshInsightReportFromDisk(id: string): InsightReport | undefined {
  syncPdfDrivenCatalogs();
  return getFixtures().insightReports.find((item) => item.id === id);
}

/** 打开详情时同步目录并返回最新条目（含新建 PDF） */
export function refreshWetalkIssueFromDisk(id: string): WetalkIssue | undefined {
  syncPdfDrivenCatalogs();
  return getFixtures().wetalkIssues.find((item) => item.id === id);
}

/** 打开班车接口时按 PDF 刷新苏州时刻（替换 PDF 后无需重启） */
export function refreshShuttleFromPdf(location: string): void {
  if (!SHUTTLE_PDF_LOCATIONS.has(location)) {
    return;
  }
  refreshAllMinioPdfsInBackground();
  const fixtures = getFixtures();
  try {
    const fromPdf = loadShuttleDataFromPdf();
    if (fromPdf) {
      fixtures.shuttleByLocation[location] = fromPdf;
    }
  } catch (error) {
    if (error instanceof ShuttlePdfParseError) {
      logWarn(`Shuttle PDF refresh failed for ${location}`, { message: error.message });
      return;
    }
    throw error;
  }
}

/** 打开园区地图时按 PDF 刷新苏州地图（仅 Suzhou；其他地点不动） */
export function refreshCampusMapFromPdf(location: string): void {
  if (location !== SUZHOU_MINIO_LOCATION) {
    return;
  }
  refreshAllMinioPdfsInBackground();
  const fixtures = getFixtures();
  try {
    const raw = readJsonFile(`kb-life/locations/${location}/campus-map.json`, campusMapSchema);
    fixtures.campusMapByLocation[location] = resolveCampusMap(location, raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn(`Campus map PDF refresh failed for ${location}`, { message });
  }
}

export function resetFixtureStore(): void {
  store = null;
}

function collectDuplicateBlockIds(blocks: Array<{ id: string }>): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  blocks.forEach((block) => {
    if (seen.has(block.id)) {
      duplicates.push(block.id);
      return;
    }
    seen.add(block.id);
  });
  return duplicates;
}

const INSIGHT_PDF_URL_PREFIX = '/mock-assets/services/insights/files/';
const INSIGHT_SHEETS_URL_PREFIX = '/mock-assets/services/insights/sheets/';
const WETALK_PDF_URL_PREFIX = '/mock-assets/kb-life/wetalk/files/';
const WETALK_SHEETS_URL_PREFIX = '/mock-assets/kb-life/wetalk/sheets/';
const CAMPUS_MAP_PDF_URL_PREFIX = '/mock-assets/kb-life/campus-maps/files/';
const CAMPUS_MAP_SHEETS_URL_PREFIX = '/mock-assets/kb-life/campus-maps/sheets/';
const SHUTTLE_MAP_PDF_URL_PREFIX = '/mock-assets/kb-life/shuttle-maps/files/';
const SHUTTLE_MAP_SHEETS_URL_PREFIX = '/mock-assets/kb-life/shuttle-maps/sheets/';

type SheetPage = {
  id: string;
  type: 'sheet';
  title: string;
  coverImage: NonNullable<InsightReport['pages'][number]['coverImage']>;
};

function buildSheetPagesFromDisk(options: {
  id: string;
  sheetsDirRelative: string;
  sheetsUrlPrefix: string;
}): SheetPage[] {
  const sheetsDir = path.join(PUBLIC_DIR, options.sheetsDirRelative, options.id);
  if (!fs.existsSync(sheetsDir)) {
    return [];
  }
  const files = fs
    .readdirSync(sheetsDir)
    .filter((name) => /\.png$/i.test(name))
    .sort();
  return files.map((fileName, index) => {
    const absolute = path.join(sheetsDir, fileName);
    // 读取尺寸可选；用固定宽高比即可通过 schema
    let width = 1080;
    let height = 764;
    try {
      // PNG IHDR：宽高在偏移 16/20
      const buffer = fs.readFileSync(absolute);
      if (buffer.length >= 24) {
        width = buffer.readUInt32BE(16) || width;
        height = buffer.readUInt32BE(20) || height;
      }
    } catch {
      // keep defaults
    }
    return {
      id: `${options.id}-sheet-${index + 1}`,
      type: 'sheet' as const,
      title: index === 0 ? 'Cover' : `Page ${index}`,
      coverImage: {
        url: `${options.sheetsUrlPrefix}${options.id}/${fileName}`,
        alt: `${options.id} page ${index + 1}`,
        width,
        height,
        aspectRatio: Number((width / height).toFixed(4)),
      },
    };
  });
}

/** Insight JSON（含可选 pdfFile）→ 运行时 InsightReport（含 pdfUrl / sheet pages） */
function resolveInsightReport(
  relativePath: string,
  raw: ReturnType<typeof insightReportSchema.parse>,
): InsightReport {
  const { pdfFile, pages, ...rest } = raw;
  const declaredPages = pages ?? [];

  if (!pdfFile) {
    return {
      ...rest,
      pages: declaredPages,
    };
  }

  const pdfAbsolute = resolveInsightPdfAbsolute(pdfFile);
  if (!pdfAbsolute) {
    throw new FixtureValidationError(
      `Insight PDF 不存在: ${relativePath} 声明了 pdfFile="${pdfFile}"，MinIO 缓存与本地 fixtures/services/insights/files 均未找到`,
    );
  }

  const sheetsDir = path.join(PUBLIC_DIR, 'mock-assets/services/insights/sheets', rest.id);
  try {
    if (!declaredPages.length) {
      ensurePdfSheets({ id: rest.id, pdfAbsolute, sheetsDir });
    }
  } catch (error) {
    if (error instanceof PdfSheetRenderError) {
      throw new FixtureValidationError(error.message);
    }
    throw error;
  }

  const sheetPages = declaredPages.length
    ? []
    : buildSheetPagesFromDisk({
        id: rest.id,
        sheetsDirRelative: 'mock-assets/services/insights/sheets',
        sheetsUrlPrefix: INSIGHT_SHEETS_URL_PREFIX,
      });
  const resolvedPages = declaredPages.length ? declaredPages : sheetPages;

  if (!resolvedPages.length) {
    throw new FixtureValidationError(
      `Insight ${rest.id} 有 pdfFile 但渲页后仍无 pages: ${sheetsDir}`,
    );
  }

  return {
    ...rest,
    coverImage: sheetPages[0]?.coverImage ?? rest.coverImage,
    tag: rest.tag ?? 'PDF',
    pages: resolvedPages,
    pdfUrl: `${INSIGHT_PDF_URL_PREFIX}${encodeURIComponent(pdfFile)}`,
  };
}

/** WeTalk JSON（含可选 pdfFile）→ 运行时 WetalkIssue（含 pdfUrl / sheet pages） */
function resolveWetalkIssue(
  relativePath: string,
  raw: ReturnType<typeof wetalkIssueSchema.parse>,
): WetalkIssue {
  const { pdfFile, pages, ...rest } = raw;
  const declaredPages = pages ?? [];

  if (!pdfFile) {
    return {
      ...rest,
      pages: declaredPages,
    };
  }

  const pdfAbsolute = resolveWetalkPdfAbsolute(pdfFile);
  if (!pdfAbsolute) {
    throw new FixtureValidationError(
      `WeTalk PDF 不存在: ${relativePath} 声明了 pdfFile="${pdfFile}"，MinIO 缓存与本地 fixtures/kb-life/wetalk/files 均未找到`,
    );
  }

  const sheetsDir = path.join(PUBLIC_DIR, 'mock-assets/kb-life/wetalk/sheets', rest.id);
  try {
    if (!declaredPages.length) {
      ensurePdfSheets({ id: rest.id, pdfAbsolute, sheetsDir });
    }
  } catch (error) {
    if (error instanceof PdfSheetRenderError) {
      throw new FixtureValidationError(error.message);
    }
    throw error;
  }

  const sheetPages = declaredPages.length
    ? []
    : buildSheetPagesFromDisk({
        id: rest.id,
        sheetsDirRelative: 'mock-assets/kb-life/wetalk/sheets',
        sheetsUrlPrefix: WETALK_SHEETS_URL_PREFIX,
      });
  const resolvedPages = declaredPages.length ? declaredPages : sheetPages;

  if (!resolvedPages.length) {
    throw new FixtureValidationError(
      `WeTalk ${rest.id} 有 pdfFile 但渲页后仍无 pages: ${sheetsDir}`,
    );
  }

  return {
    ...rest,
    coverImage: sheetPages[0]?.coverImage ?? rest.coverImage,
    pages: resolvedPages,
    pdfUrl: `${WETALK_PDF_URL_PREFIX}${encodeURIComponent(pdfFile)}`,
  };
}

function findCampusMapPdfFileName(location: string, declared?: string): string | null {
  // 仅苏州走 MinIO suzhou/campus-map；其他地点仍读本地 Map/
  if (location === SUZHOU_MINIO_LOCATION) {
    return findSuzhouCampusMapPdfFileName(declared);
  }
  const mapDir = path.join(FIXTURES_DIR, 'kb-life/locations', location, 'Map');
  if (!fs.existsSync(mapDir)) {
    return null;
  }
  if (declared) {
    const absolute = path.join(mapDir, declared);
    return fs.existsSync(absolute) ? declared : null;
  }
  const files = fs
    .readdirSync(mapDir)
    .filter((name) => name.toLowerCase().endsWith('.pdf') && !name.startsWith('.'));
  if (!files.length) {
    return null;
  }
  const preferred = files.find((name) => name.toLowerCase() === 'park-map.pdf');
  if (preferred) {
    return preferred;
  }
  return files
    .map((fileName) => ({
      fileName,
      mtimeMs: fs.statSync(path.join(mapDir, fileName)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.fileName ?? null;
}

function resolveCampusMapPdfAbsolute(location: string, fileName: string): string | null {
  if (location === SUZHOU_MINIO_LOCATION) {
    return resolveSuzhouCampusMapPdfAbsolute(fileName);
  }
  const absolute = path.join(FIXTURES_DIR, 'kb-life/locations', location, 'Map', fileName);
  return fs.existsSync(absolute) ? absolute : null;
}

/** campus-map.json + 可选 Map/*.pdf → 运行时 CampusMapData（含 sheet pages） */
function resolveCampusMap(
  location: string,
  raw: ReturnType<typeof campusMapSchema.parse>,
): CampusMapData {
  const { pdfFile, pages, ...rest } = raw;
  const declaredPages = pages ?? [];
  const resolvedPdfFile = findCampusMapPdfFileName(location, pdfFile);

  if (!resolvedPdfFile) {
    return {
      ...rest,
      pages: declaredPages.length ? declaredPages : undefined,
    };
  }

  const pdfAbsolute = resolveCampusMapPdfAbsolute(location, resolvedPdfFile);
  if (!pdfAbsolute) {
    return {
      ...rest,
      pages: declaredPages.length ? declaredPages : undefined,
    };
  }
  const sheetsDir = path.join(PUBLIC_DIR, 'mock-assets/kb-life/campus-maps/sheets', location);
  try {
    if (!declaredPages.length) {
      ensurePdfSheets({ id: `campus-map-${location}`, pdfAbsolute, sheetsDir });
    }
  } catch (error) {
    if (error instanceof PdfSheetRenderError) {
      throw new FixtureValidationError(error.message);
    }
    throw error;
  }

  const sheetPages = declaredPages.length
    ? declaredPages
    : buildSheetPagesFromDisk({
        id: location,
        sheetsDirRelative: 'mock-assets/kb-life/campus-maps/sheets',
        sheetsUrlPrefix: CAMPUS_MAP_SHEETS_URL_PREFIX,
      });

  if (!sheetPages.length) {
    throw new FixtureValidationError(
      `园区地图 ${location} 有 PDF 但渲页后仍无 pages: ${sheetsDir}`,
    );
  }

  return {
    ...rest,
    image: sheetPages[0]?.coverImage ?? rest.image,
    pages: sheetPages,
    pdfUrl: `${CAMPUS_MAP_PDF_URL_PREFIX}${encodeURIComponent(location)}/${encodeURIComponent(resolvedPdfFile)}`,
  };
}

/** 苏州等园区：班车 PDF → 线路图 sheet pages（与园区地图同一套阅读器） */
export function resolveShuttleMap(location: string): CampusMapData | undefined {
  if (!SHUTTLE_PDF_LOCATIONS.has(location)) {
    return undefined;
  }
  const pdfAbsolute = findShuttlePdfAbsolute();
  if (!pdfAbsolute) {
    return undefined;
  }
  const fileName = path.basename(pdfAbsolute);
  const sheetsDir = path.join(PUBLIC_DIR, 'mock-assets/kb-life/shuttle-maps/sheets', location);
  try {
    ensurePdfSheets({ id: `shuttle-map-${location}`, pdfAbsolute, sheetsDir });
  } catch (error) {
    if (error instanceof PdfSheetRenderError) {
      logWarn(`Shuttle map PDF sheet render failed for ${location}`, {
        message: error.message,
      });
      return undefined;
    }
    throw error;
  }
  const sheetPages = buildSheetPagesFromDisk({
    id: location,
    sheetsDirRelative: 'mock-assets/kb-life/shuttle-maps/sheets',
    sheetsUrlPrefix: SHUTTLE_MAP_SHEETS_URL_PREFIX,
  });
  if (!sheetPages.length) {
    return undefined;
  }
  const title = `班车线路图 (Shuttle Map) · ${location}`;
  return {
    title,
    image: sheetPages[0]?.coverImage ?? {
      url: '/mock-assets/kb-life/campus-map-suzhou.png',
      alt: title,
      width: 1200,
      height: 800,
      aspectRatio: 1.5,
    },
    pages: sheetPages,
    pdfUrl: `${SHUTTLE_MAP_PDF_URL_PREFIX}${encodeURIComponent(location)}/${encodeURIComponent(fileName)}`,
  };
}

/** 将 `/mock-assets/...` 解析为磁盘绝对路径（Insight / WeTalk / 园区地图 PDF 来自 fixtures） */
export function resolveMockAssetAbsolutePath(assetPath: string): string {
  if (assetPath.startsWith(INSIGHT_PDF_URL_PREFIX)) {
    const fileName = decodeURIComponent(assetPath.slice(INSIGHT_PDF_URL_PREFIX.length));
    return resolveInsightPdfAbsolute(fileName) ?? path.join(FIXTURES_DIR, 'services/insights/files', fileName);
  }
  if (assetPath.startsWith(WETALK_PDF_URL_PREFIX)) {
    const fileName = decodeURIComponent(assetPath.slice(WETALK_PDF_URL_PREFIX.length));
    return resolveWetalkPdfAbsolute(fileName) ?? path.join(FIXTURES_DIR, 'kb-life/wetalk/files', fileName);
  }
  if (assetPath.startsWith(CAMPUS_MAP_PDF_URL_PREFIX)) {
    const rest = assetPath.slice(CAMPUS_MAP_PDF_URL_PREFIX.length);
    const slash = rest.indexOf('/');
    const location = decodeURIComponent(slash >= 0 ? rest.slice(0, slash) : rest);
    const fileName = decodeURIComponent(slash >= 0 ? rest.slice(slash + 1) : '');
    return (
      resolveCampusMapPdfAbsolute(location, fileName) ??
      path.join(FIXTURES_DIR, 'kb-life/locations', location, 'Map', fileName)
    );
  }
  if (assetPath.startsWith(SHUTTLE_MAP_PDF_URL_PREFIX)) {
    const rest = assetPath.slice(SHUTTLE_MAP_PDF_URL_PREFIX.length);
    const slash = rest.indexOf('/');
    const location = decodeURIComponent(slash >= 0 ? rest.slice(0, slash) : rest);
    const fileName = decodeURIComponent(slash >= 0 ? rest.slice(slash + 1) : '');
    if (location === SUZHOU_MINIO_LOCATION) {
      const fromMinio = resolveSuzhouShuttleBusPdfAbsolute(fileName);
      if (fromMinio && fs.existsSync(fromMinio)) {
        return fromMinio;
      }
    }
    const fromLocal = findShuttlePdfAbsolute();
    if (fromLocal && fs.existsSync(fromLocal)) {
      return fromLocal;
    }
    return path.join(PUBLIC_DIR, assetPath.replace(/^\//, ''));
  }
  return path.join(PUBLIC_DIR, assetPath.replace(/^\//, ''));
}

export function collectAssetPaths(value: unknown, bucket = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetPaths(item, bucket));
    return bucket;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      if (
        (key === 'url' || key === 'imageUrl' || key === 'pdfUrl') &&
        typeof nested === 'string' &&
        nested.startsWith('/mock-assets/')
      ) {
        bucket.add(nested);
      }
      collectAssetPaths(nested, bucket);
    });
  }
  return bucket;
}

const MINI_PROGRAM_PAGES = new Set([
  '/pages/index/index',
  '/pages/services/index',
  '/pages/services/insights/index',
  '/pages/services/insights/reader',
  '/pages/services/insights/access-denied/index',
  '/pages/kb-life/index',
  '/pages/profile/index',
  '/pages/profile/personal-info/index',
  '/pages/news/index',
  '/pages/news/detail',
  '/pages/brand/index',
  '/pages/products/index',
  '/pages/products/detail',
  '/pages/cases/index',
  '/pages/cases/detail',
  '/pages/kb-life/shuttle-bus/index',
  '/pages/kb-life/canteen/index',
  '/pages/kb-life/holiday-calendar/index',
  '/pages/kb-life/open-positions/index',
  '/pages/kb-life/open-positions/detail',
  '/pages/kb-life/handbook/index',
  '/pages/kb-life/care/index',
  '/pages/kb-life/events/index',
  '/pages/kb-life/events/annual-dinner/index',
  '/pages/kb-life/events/outings/index',
  '/pages/kb-life/events/health/index',
]);

function aspectRatioMismatch(image: { width: number; height: number; aspectRatio: number }): boolean {
  return Math.abs(image.width / image.height - image.aspectRatio) > 0.05;
}

function collectArticleLinks(
  blocks: Array<{
    type: string;
    url?: string;
    linkType?: string;
    spans?: Array<{ type: string; href?: string }>;
  }>,
): Array<{ url: string; linkType: 'internal' | 'external' }> {
  const links: Array<{ url: string; linkType: 'internal' | 'external' }> = [];
  blocks.forEach((block) => {
    if (block.type === 'link' && block.url) {
      links.push({
        url: block.url,
        linkType: block.linkType === 'external' ? 'external' : 'internal',
      });
    }
    if (block.type === 'paragraph' && block.spans) {
      block.spans.forEach((span) => {
        if (span.type === 'link' && span.href) {
          links.push({
            url: span.href,
            linkType: span.href.startsWith('/pages/') ? 'internal' : 'external',
          });
        }
      });
    }
  });
  return links;
}

function validateLink(articleId: string, url: string, linkType: 'internal' | 'external', errors: string[]): void {
  if (/javascript:/i.test(url) || url.startsWith('data:')) {
    errors.push(`新闻 ${articleId} 含有非法链接: ${url}`);
    return;
  }
  if (linkType === 'internal') {
    const pagePath = url.split('?')[0];
    if (!MINI_PROGRAM_PAGES.has(pagePath)) {
      errors.push(`新闻 ${articleId} 的内部链接不是合法小程序路径: ${url}`);
    }
    return;
  }
  if (!/^https?:\/\//i.test(url)) {
    errors.push(`新闻 ${articleId} 的外部链接必须是 http/https: ${url}`);
  }
}

export function assertFixtureIntegrity(data: MockFixtureStore): void {
  const newsListIds = new Set(data.newsList.map((item) => item.id));
  const newsArticleIds = new Set(data.newsArticles.map((item) => item.id));
  const newsCategoryIds = new Set(data.newsCategories.map((item) => item.id));
  const productIds = new Set(data.products.map((item) => item.id));
  const productDetailIds = new Set(data.productDetails.map((item) => item.id));
  const productCategoryIds = new Set(data.productCategories.categories.map((item) => item.id));
  const caseIds = new Set(data.cases.map((item) => item.id));
  const caseDetailIds = new Set(data.caseDetails.map((item) => item.id));
  const caseCategoryIds = new Set(data.caseCategories.map((item) => item.id));
  const errors: string[] = [];

  if (data.home.banners.length < 3) errors.push('首页 Banner 少于 3 条');
  if (data.home.quickEntries.length < 4) errors.push('首页快捷入口少于 4 条');
  // 新闻已迁到管理端 article-content；本地 fixtures/news 可为空（仅作关闭远程时的空回退）
  if (data.newsArticles.length > 0) {
    if (data.newsCategories.length < 1) errors.push('存在新闻文章但分类为空');
    if (data.newsList.length < 1) errors.push('存在新闻文章但公开摘要为空');
    if (data.newsArticles.filter((item) => item.status === 'published').length < 1) {
      errors.push('存在新闻文章但没有已发布条目');
    }
  }
  if (data.products.length < 5) errors.push('产品少于 5 条');
  if (data.productDetails.length < 5) errors.push('产品详情少于 5 条');
  if (data.cases.length < 6) errors.push('案例少于 6 条');
  if (data.caseDetails.length < 6) errors.push('案例详情少于 6 条');

  const newsSlugs = new Set<string>();
  if (data.newsArticles.length !== newsArticleIds.size) {
    errors.push('新闻 ID 不唯一');
  }
  data.newsArticles.forEach((article) => {
    if (newsSlugs.has(article.slug)) {
      errors.push(`新闻 slug 重复: ${article.slug}`);
    }
    newsSlugs.add(article.slug);
    if (!newsCategoryIds.has(article.category.id)) {
      errors.push(`新闻 ${article.id} 的分类 ${article.category.id} 不存在`);
    }
    if (article.status === 'published' && !article.publishedAt) {
      errors.push(`新闻 ${article.id} 为 published 但缺少 publishedAt`);
    }
    if (article.status === 'scheduled' && !article.scheduledAt) {
      errors.push(`新闻 ${article.id} 为 scheduled 但缺少 scheduledAt`);
    }
    if (aspectRatioMismatch(article.coverImage)) {
      errors.push(`新闻 ${article.id} 封面 aspectRatio 与宽高不一致`);
    }
    if (article.thumbnailImage && aspectRatioMismatch(article.thumbnailImage)) {
      errors.push(`新闻 ${article.id} 缩略图 aspectRatio 与宽高不一致`);
    }
    collectDuplicateBlockIds(article.richContent).forEach((blockId) => {
      errors.push(`新闻 ${article.id} 的 richContent block id 重复: ${blockId}`);
    });
    article.relatedArticleIds.forEach((relatedId) => {
      if (relatedId === article.id) {
        errors.push(`新闻 ${article.id} 不能关联自身`);
      }
      if (!newsArticleIds.has(relatedId)) {
        errors.push(`新闻 ${article.id} 的 relatedArticleIds 引用了不存在的 ${relatedId}`);
      }
    });
    collectArticleLinks(article.richContent).forEach((link) => {
      validateLink(article.id, link.url, link.linkType, errors);
    });
  });

  data.newsList.forEach((item) => {
    if (!newsCategoryIds.has(item.category.id)) {
      errors.push(`新闻 ${item.id} 的分类 ${item.category.id} 不存在`);
    }
    if (!newsArticleIds.has(item.id)) {
      errors.push(`公开新闻列表 ${item.id} 缺少对应详情`);
    }
    const article = data.newsArticles.find((entry) => entry.id === item.id);
    if (article && article.status !== 'published') {
      errors.push(`公开新闻列表包含非 published 文章: ${item.id}`);
    }
  });

  data.productCategories.categories.forEach((category) => {
    if (!productIds.has(category.featuredProductId)) {
      errors.push(`产品分类 ${category.id} 的 featuredProductId ${category.featuredProductId} 不存在`);
    }
    if (!productDetailIds.has(category.featuredProductId)) {
      errors.push(`产品分类 ${category.id} 的 featuredProductId ${category.featuredProductId} 无法打开对应详情`);
    }
  });
  data.products.forEach((item) => {
    if (!productCategoryIds.has(item.category.id)) {
      errors.push(`产品 ${item.id} 的分类 ${item.category.id} 不存在`);
    }
    if (!productDetailIds.has(item.id)) {
      errors.push(`产品列表 ${item.id} 缺少对应详情`);
    }
  });
  data.productDetails.forEach((detail) => {
    if (!productIds.has(detail.id)) {
      errors.push(`产品详情 ${detail.id} 在列表中不存在`);
    }
    collectDuplicateBlockIds(detail.richContent).forEach((blockId) => {
      errors.push(`产品 ${detail.id} 的 richContent block id 重复: ${blockId}`);
    });
    detail.relatedIds.forEach((relatedId) => {
      if (!productIds.has(relatedId) && !productDetailIds.has(relatedId)) {
        errors.push(`产品 ${detail.id} 的 relatedIds 引用了不存在的 ${relatedId}`);
      }
    });
  });

  data.cases.forEach((item) => {
    if (!caseCategoryIds.has(item.category.id)) {
      errors.push(`案例 ${item.id} 的分类 ${item.category.id} 不存在`);
    }
    if (!caseDetailIds.has(item.id)) {
      errors.push(`案例列表 ${item.id} 缺少对应详情`);
    }
  });
  data.caseDetails.forEach((detail) => {
    if (!caseIds.has(detail.id)) {
      errors.push(`案例详情 ${detail.id} 在列表中不存在`);
    }
    collectDuplicateBlockIds(detail.richContent).forEach((blockId) => {
      errors.push(`案例 ${detail.id} 的 richContent block id 重复: ${blockId}`);
    });
    detail.relatedIds.forEach((relatedId) => {
      if (!caseIds.has(relatedId) && !caseDetailIds.has(relatedId)) {
        errors.push(`案例 ${detail.id} 的 relatedIds 引用了不存在的 ${relatedId}`);
      }
    });
  });

  if (data.home.latestNews.length > 3) {
    errors.push('首页最新资讯超过 3 条');
  }
  data.home.latestNews.forEach((item) => {
    if (!newsListIds.has(item.id)) {
      errors.push(`首页最新资讯 ${item.id} 不在公开新闻列表中`);
    }
    if (!newsArticleIds.has(item.id)) {
      errors.push(`首页最新资讯 ${item.id} 无法打开对应详情`);
    }
    const article = data.newsArticles.find((entry) => entry.id === item.id);
    if (article && article.status !== 'published') {
      errors.push(`首页最新资讯 ${item.id} 不是 published 状态`);
    }
  });
  data.newsArticles.forEach((article) => {
    if (article.placement.showOnBanner && article.status === 'published' && article.publishedAt) {
      if (!newsListIds.has(article.id)) {
        errors.push(`首页 Banner 新闻 ${article.id} 不在公开列表中`);
      }
    }
  });
  data.home.recommendedProducts.forEach((item) => {
    if (!productIds.has(item.id)) {
      errors.push(`首页推荐产品 ${item.id} 在产品列表中不存在`);
    }
    if (!productDetailIds.has(item.id)) {
      errors.push(`首页推荐产品 ${item.id} 无法打开对应详情`);
    }
  });
  data.home.recommendedCases.forEach((item) => {
    if (!caseIds.has(item.id)) {
      errors.push(`首页推荐案例 ${item.id} 在案例列表中不存在`);
    }
    if (!caseDetailIds.has(item.id)) {
      errors.push(`首页推荐案例 ${item.id} 无法打开对应详情`);
    }
  });
  const assetPaths = collectAssetPaths(data);
  assetPaths.forEach((assetPath) => {
    const absolute = resolveMockAssetAbsolutePath(assetPath);
    if (!fs.existsSync(absolute)) {
      errors.push(`静态资源不存在: ${assetPath} -> ${absolute}`);
    }
  });

  data.insightReports.forEach((report) => {
    if (!report.pdfUrl && report.pages.length === 0) {
      errors.push(`Insight ${report.id} 既无 pdfUrl 也无 pages`);
    }
  });
  data.wetalkIssues.forEach((issue) => {
    if (!issue.pdfUrl && issue.pages.length === 0) {
      errors.push(`WeTalk ${issue.id} 既无 pdfUrl 也无 pages`);
    }
  });

  if (JSON.stringify(data).includes('127.0.0.1')) {
    errors.push('Fixture 中不得硬编码 127.0.0.1');
  }

  if (errors.length > 0) {
    const message = `Fixture 完整性校验失败:\n${errors.map((item) => `  - ${item}`).join('\n')}`;
    logError(message);
    throw new FixtureValidationError(message);
  }
}
