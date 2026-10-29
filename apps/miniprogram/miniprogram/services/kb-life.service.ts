import type { ImageResource } from '../types/content';
import { getStoredCampusLocation } from '../utils/campus-location';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { isEmployeeIdentity } from '../utils/identity-access';
import { getLoginCodeQueryParams } from './identity-binding.service';
import { get, withRequestCache } from './request';
import { RequestError } from '../types/api';

async function withIdentityQuery<T extends Record<string, unknown>>(
  params: T,
): Promise<T & { loginCode?: string }> {
  return { ...params, ...(await getLoginCodeQueryParams()) };
}
import type { InsightReportView } from './services.service';

export interface LifeBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

export interface CampusService {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  path?: string;
}

export interface CanteenMenuItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

export interface CanteenSection {
  id: string;
  title: string;
  text: string;
  images: string[];
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

export interface ShuttleMapPayload {
  title: string;
  center: { latitude: number; longitude: number };
  routes: ShuttleMapRouteLine[];
}

export interface ShuttleStop {
  time?: string;
  name: string;
  note?: string;
}

export interface ShuttleRoute {
  id: string;
  name: string;
  stops: ShuttleStop[];
  /** 搜索用拼接文案 */
  stationsText: string;
  /** 展示用：每站一行，「时间;地点」 */
  stopLines: string[];
}

interface KbLifeEntriesDto {
  banners: Array<{ id: string; title: string; subtitle: string; image: ImageResource }>;
  locations: string[];
  campusServices: Array<{ id: string; title: string; subtitle: string; icon: ImageResource; path?: string }>;
  employeeServices: Array<{ id: string; title: string; subtitle: string; icon: ImageResource; path?: string }>;
}

interface CanteenDto {
  intro: string;
  live?: boolean;
  title?: string;
  menuDate?: string;
  coverImage?: ImageResource;
  menuItems: Array<{ id: string; title: string; description: string; image: ImageResource }>;
  sections?: Array<{
    id: string;
    title: string;
    text: string;
    images: ImageResource[];
  }>;
}

interface ShuttleDto {
  notice: string;
  routes: Array<{
    id: string;
    name: string;
    stops: ShuttleStop[];
    stationsText?: string;
  }>;
  map?: {
    title: string;
    center: { latitude: number; longitude: number };
    routes: Array<{
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
    }>;
  };
}

/** 班车站点展示：时间与地点用空格分隔；无时间则只显示地点 */
export function formatShuttleStopLine(stop: ShuttleStop): string {
  const place = stop.note ? `${stop.name}（${stop.note}）` : stop.name;
  if (stop.time) {
    return `${stop.time} ${place}`;
  }
  return place;
}

function mapShuttleRoute(item: ShuttleDto['routes'][number]): ShuttleRoute {
  const stopLines = item.stops.map(formatShuttleStopLine);
  return {
    id: item.id,
    name: item.name,
    stops: item.stops,
    stopLines,
    stationsText: stopLines.join('\n'),
  };
}

function mapService(
  item: { id: string; title: string; subtitle: string; icon: ImageResource; path?: string },
): CampusService {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    icon: toAssetUrl(item.icon),
    path: item.path,
  };
}

export async function getKbLifeEntries(): Promise<{
  banners: LifeBanner[];
  locations: string[];
  campusServices: CampusService[];
  employeeServices: CampusService[];
}> {
  return withRequestCache('kb-life:entries', 60_000, async () => {
    const data = await get<KbLifeEntriesDto>(API_ENDPOINTS.kbLifeEntries);
    return {
      banners: data.banners.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        image: toAssetUrl(item.image),
      })),
      locations: data.locations,
      campusServices: data.campusServices.map(mapService),
      employeeServices: data.employeeServices.map(mapService),
    };
  });
}

export async function getCanteen(
  location: string = getStoredCampusLocation(),
): Promise<{
  intro: string;
  menuItems: CanteenMenuItem[];
  sections: CanteenSection[];
  live: boolean;
  title: string;
  menuDate: string;
  coverImage: string;
  location: string;
}> {
  const data = await get<CanteenDto & { location?: string }>(
    API_ENDPOINTS.kbLifeCanteen,
    await withIdentityQuery({ location }),
  );
  return {
    intro: data.intro,
    live: true,
    title: data.title || '',
    menuDate: data.menuDate || '',
    coverImage: data.coverImage ? toAssetUrl(data.coverImage) : '',
    menuItems: [],
    sections: (data.sections ?? []).map((section) => ({
      id: section.id,
      title: section.title,
      text: section.text,
      images: section.images.map((image) => toAssetUrl(image)),
    })),
    location: data.location || location,
  };
}

export async function getShuttle(
  location: string = getStoredCampusLocation(),
): Promise<{
  notice: string;
  routes: ShuttleRoute[];
  location: string;
  map?: ShuttleMapPayload;
}> {
  const data = await get<ShuttleDto & { location?: string }>(
    API_ENDPOINTS.kbLifeShuttle,
    await withIdentityQuery({ location }),
  );
  const resolvedLocation = data.location || location;
  const map = data.map
    ? {
        title: data.map.title,
        center: data.map.center,
        routes: data.map.routes ?? [],
      }
    : undefined;
  return {
    notice: data.notice,
    routes: data.routes.map(mapShuttleRoute),
    location: resolvedLocation,
    map,
  };
}

export type ShuttleTripMode = 'transit' | 'bicycling' | 'walking';

export interface ShuttleTripLegPlan {
  mode: ShuttleTripMode;
  modeLabel: string;
  durationMinutes: number;
  distanceMeters: number;
  summary: string;
}

export interface ShuttleTripNearbyStop {
  stopId: number;
  stopName: string;
  timesText: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  shuttleLineNames: string[];
  plans: ShuttleTripLegPlan[];
  distanceText?: string;
  shuttleLinesText?: string;
  stopTitle?: string;
}

export interface ShuttleTripPlanResult {
  location: string;
  destination: {
    name: string;
    latitude: number;
    longitude: number;
  };
  nearbyStops: ShuttleTripNearbyStop[];
}

function formatTripDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export async function planShuttleTrip(
  destination: string,
  location: string = getStoredCampusLocation(),
  coords?: { latitude: number; longitude: number; name?: string },
): Promise<ShuttleTripPlanResult> {
  const params: Record<string, string | number> = { location, destination };
  if (coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
    params.latitude = coords.latitude;
    params.longitude = coords.longitude;
    if (coords.name) {
      params.name = coords.name;
    }
  }
  const data = await get<ShuttleTripPlanResult>(
    API_ENDPOINTS.kbLifeShuttleTripPlan,
    await withIdentityQuery(params),
  );
  return {
    ...data,
    nearbyStops: data.nearbyStops.map((stop) => ({
      ...stop,
      timesText: stop.timesText || '',
      distanceText: formatTripDistance(stop.distanceMeters),
      shuttleLinesText: stop.shuttleLineNames.join(' · '),
      stopTitle: stop.timesText ? `${stop.stopName} · ${stop.timesText}` : stop.stopName,
    })),
  };
}

export function filterShuttleRoutes(routes: ShuttleRoute[], keyword: string): ShuttleRoute[] {
  const query = keyword.trim().toLowerCase();
  if (!query) {
    return routes;
  }
  return routes.filter((item) => {
    const haystack = `${item.id} ${item.name} ${item.stationsText}`.toLowerCase();
    return haystack.includes(query);
  });
}

export interface WetalkCover {
  id: string;
  title: string;
  date: string;
  image: string;
}

interface WetalkIssueDto {
  id: string;
  title: string;
  date: string;
  coverImage: ImageResource;
  pdfUrl?: string;
  pages: Array<{
    id: string;
    type: 'cover' | 'contents' | 'content' | 'sheet';
    title: string;
    coverImage?: ImageResource;
    headlineCn?: string[];
    headlineEn?: string;
    institute?: string;
    brand?: string;
    toc?: Array<{ index: string; titleEn: string; titleCn: string; lines: string[] }>;
    chapterLabel?: string;
    chapterTitle?: string;
    bodyImage?: ImageResource;
    paragraphs?: string[];
    bullets?: string[];
  }>;
}

export async function getWetalkIssues(): Promise<WetalkCover[]> {
  if (!isEmployeeIdentity()) {
    return [];
  }
  return withRequestCache('wetalk:list', 60_000, async () => {
    const data = await get<{ items: Array<Omit<WetalkIssueDto, 'pages'>> }>(
      API_ENDPOINTS.kbLifeWetalk,
      await withIdentityQuery({}),
    );
    return data.items.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      image: toAssetUrl(item.coverImage),
    }));
  });
}

/** 映射为 InsightReportView，复用 insight-reader（含 PDF→sheet） */
export async function getWetalkIssueAsReport(id: string): Promise<InsightReportView> {
  if (!isEmployeeIdentity()) {
    throw new RequestError('此功能仅面向 KB 员工');
  }
  return withRequestCache(`wetalk:detail:${id}`, 5 * 60_000, async () => {
    const data = await get<WetalkIssueDto>(
      API_ENDPOINTS.kbLifeWetalkDetail(id),
      await withIdentityQuery({}),
    );
    return {
      id: data.id,
      title: data.title,
      titleEn: data.title,
      caption: data.date,
      kicker: 'WeTalk',
      english: data.date,
      image: toAssetUrl(data.coverImage),
      gating: false,
      pdfUrl: data.pdfUrl,
      pages: data.pages.map((page) => ({
        id: page.id,
        type: page.type,
        title: page.title,
        coverImage: page.coverImage ? toAssetUrl(page.coverImage) : undefined,
        headlineCn: page.headlineCn,
        headlineEn: page.headlineEn,
        institute: page.institute,
        brand: page.brand,
        toc: page.toc,
        chapterLabel: page.chapterLabel,
        chapterTitle: page.chapterTitle,
        bodyImage: page.bodyImage ? toAssetUrl(page.bodyImage) : undefined,
        paragraphs: page.paragraphs,
        bullets: page.bullets,
        thumbTone: page.type,
      })),
    };
  });
}

export async function getCampusMap(
  location: string = getStoredCampusLocation(),
): Promise<{
  title: string;
  image: string;
  location: string;
  pdfUrl?: string;
  pages: InsightReportView['pages'];
}> {
  return withRequestCache(`campus-map:${location}`, 5 * 60_000, async () => {
    const data = await get<{
      title: string;
      image: ImageResource;
      location?: string;
      pdfUrl?: string;
      pages?: Array<{
        id: string;
        type: 'sheet';
        title: string;
        coverImage?: ImageResource;
      }>;
    }>(API_ENDPOINTS.kbLifeCampusMap, await withIdentityQuery({ location }));
    return {
      title: data.title,
      image: toAssetUrl(data.image),
      location: data.location || location,
      pdfUrl: data.pdfUrl,
      pages: (data.pages ?? []).map((page) => ({
        id: page.id,
        type: page.type,
        title: page.title,
        coverImage: page.coverImage ? toAssetUrl(page.coverImage) : undefined,
        thumbTone: page.type,
      })),
    };
  });
}

/** 映射为 InsightReportView，复用 insight-reader 阅读园区地图 PDF */
export async function getCampusMapAsReport(location: string): Promise<InsightReportView> {
  const data = await getCampusMap(location);
  return {
    id: data.location,
    title: data.title,
    titleEn: data.title,
    caption: data.location,
    kicker: 'Campus Map',
    english: data.location,
    image: data.image,
    gating: false,
    pdfUrl: data.pdfUrl,
    pages: data.pages,
  };
}

export async function getHolidayCalendar(
  location: string = getStoredCampusLocation(),
): Promise<{
  year: number;
  location: string;
  marks: Record<string, { name: string; type: 'holiday' | 'workday' }>;
}> {
  return get(API_ENDPOINTS.kbLifeHolidayCalendar, await withIdentityQuery({ location }));
}

export interface EmployeeHandbookView {
  title: string;
  edition: string;
  introCn: string;
  introEn: string;
  pdfUrl: string;
}

async function fetchEmployeeHandbookDocument(
  endpoint: string,
): Promise<EmployeeHandbookView> {
  const data = await get<{
    title: string;
    edition: string;
    introCn: string;
    introEn: string;
    pdfUrl?: string;
  }>(endpoint);
  return {
    title: data.title,
    edition: data.edition,
    introCn: data.introCn,
    introEn: data.introEn,
    pdfUrl: data.pdfUrl ? toAssetUrl(data.pdfUrl) : '',
  };
}

export async function getEmployeeHandbook(): Promise<EmployeeHandbookView> {
  return withRequestCache('kb-life:handbook', 5 * 60_000, () =>
    fetchEmployeeHandbookDocument(API_ENDPOINTS.kbLifeHandbook),
  );
}

export type FinancialGuidanceSectionId = 'notes' | 'manual';

export interface FinancialGuidanceSectionView {
  id: FinancialGuidanceSectionId;
  title: string;
  subtitle: string;
  introCn: string;
  introEn: string;
  pdfUrl: string;
  icon: string;
  iconBg: string;
}

export interface FinancialGuidanceHandbookView {
  title: string;
  edition: string;
  introCn: string;
  introEn: string;
  sections: FinancialGuidanceSectionView[];
}

const FINANCIAL_SECTION_PRESENTATION: Record<
  FinancialGuidanceSectionId,
  { icon: string; iconBg: string }
> = {
  notes: {
    icon: '/assets/images/kb-life/handbook.png',
    iconBg: '#fef3c7',
  },
  manual: {
    icon: '/assets/images/kb-life/handbook.png',
    iconBg: '#fff7ed',
  },
};

export async function getFinancialGuidanceHandbook(): Promise<FinancialGuidanceHandbookView> {
  return withRequestCache('kb-life:financial-handbook', 5 * 60_000, async () => {
    const data = await get<{
      title: string;
      edition: string;
      introCn: string;
      introEn: string;
      sections: Array<{
        id: FinancialGuidanceSectionId;
        title: string;
        subtitle: string;
        introCn: string;
        introEn: string;
        pdfUrl?: string;
      }>;
    }>(API_ENDPOINTS.kbLifeFinancialHandbook);
    return {
      title: data.title,
      edition: data.edition,
      introCn: data.introCn,
      introEn: data.introEn,
      sections: data.sections.map((section) => {
        const presentation = FINANCIAL_SECTION_PRESENTATION[section.id];
        return {
          id: section.id,
          title: section.title,
          subtitle: section.subtitle,
          introCn: section.introCn,
          introEn: section.introEn,
          pdfUrl: section.pdfUrl ? toAssetUrl(section.pdfUrl) : '',
          icon: presentation.icon,
          iconBg: presentation.iconBg,
        };
      }),
    };
  });
}

/** @deprecated 使用 getFinancialGuidanceHandbook */
export async function getFinancialHandbook(): Promise<EmployeeHandbookView> {
  const handbook = await getFinancialGuidanceHandbook();
  const manual =
    handbook.sections.find((item) => item.id === 'manual') ?? handbook.sections[0];
  return {
    title: manual?.title ?? handbook.title,
    edition: handbook.edition,
    introCn: manual?.introCn ?? handbook.introCn,
    introEn: manual?.introEn ?? handbook.introEn,
    pdfUrl: manual?.pdfUrl ?? '',
  };
}

export interface GuidanceDocumentNavItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  path: string;
}

export async function getGuidanceDocuments(): Promise<{
  items: GuidanceDocumentNavItem[];
}> {
  const data = await get<{
    items: Array<{
      id: string;
      title: string;
      subtitle: string;
      icon: ImageResource;
      iconBg: string;
      path: string;
    }>;
  }>(API_ENDPOINTS.kbLifeGuidanceDocuments);
  return {
    items: data.items.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      icon: toAssetUrl(item.icon),
      iconBg: item.iconBg,
      path: item.path,
    })),
  };
}

export interface EmployeeCareHeroView {
  title: string;
  subtitle: string;
  image: string;
}

export interface EmployeeCareInitiativeView {
  id: string;
  title: string;
  category: string;
  date: string;
  description: string;
  image: string;
}

export async function getEmployeeCare(): Promise<{
  hero: EmployeeCareHeroView;
  initiatives: EmployeeCareInitiativeView[];
}> {
  const data = await get<{
    hero: { title: string; subtitle: string; image: ImageResource };
    initiatives: Array<{
      id: string;
      title: string;
      category: string;
      date: string;
      description: string;
      image: ImageResource;
    }>;
  }>(API_ENDPOINTS.kbLifeCare, await withIdentityQuery({}));
  return {
    hero: {
      title: data.hero.title,
      subtitle: data.hero.subtitle,
      image: toAssetUrl(data.hero.image),
    },
    initiatives: data.initiatives.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      date: item.date,
      description: item.description,
      image: toAssetUrl(item.image),
    })),
  };
}

export interface OpenPositionSummaryView {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
}

export interface OpenPositionDetailView extends OpenPositionSummaryView {
  description: string;
  requirements: string;
}

export async function getOpenPositions(): Promise<OpenPositionSummaryView[]> {
  const data = await get<{ items: OpenPositionSummaryView[] }>(API_ENDPOINTS.kbLifeOpenPositions);
  return data.items ?? [];
}

export async function getOpenPositionDetail(id: string): Promise<OpenPositionDetailView> {
  return get<OpenPositionDetailView>(API_ENDPOINTS.kbLifeOpenPositionDetail(id));
}

export interface CompanyEventNavItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  path: string;
}

export interface AnnualDinnerView {
  title: string;
  subtitle: string;
  infoTitle: string;
  time: string;
  venue: string;
  dressCode: string;
  highlightsTitle: string;
  highlights: string[];
}

export interface OutingActivityView {
  id: string;
  title: string;
  descriptionCn: string;
  descriptionEn: string;
  timeLabel: string;
  status: 'open' | 'closed';
  statusText: string;
}

export interface HealthCheckupView {
  title: string;
  subtitle: string;
  pdfUrl: string;
  pdfFileName: string;
  images: string[];
}

export interface HighlightMomentAlbumSummaryView {
  id: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  coverImage: string;
  imageCount: number;
}

export interface HighlightMomentsView {
  title: string;
  subtitle: string;
  albums: HighlightMomentAlbumSummaryView[];
}

export interface HighlightMomentAlbumImageView {
  url: string;
  allowDownload: boolean;
}

export interface HighlightMomentAlbumDetailView {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  dateLabel: string;
  coverImage: string;
  images: HighlightMomentAlbumImageView[];
}

interface ActivitiesDto {
  live?: boolean;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: ImageResource;
    iconBg: string;
    path: string;
  }>;
  outingsMeta: { title: string; subtitle: string };
  annualDinner: AnnualDinnerView | null;
  outings: OutingActivityView[];
  health: {
    title: string;
    subtitle: string;
    pdfUrl?: string;
    pdfFileName?: string;
    images: ImageResource[];
  } | null;
  highlightMoments: {
    title: string;
    subtitle: string;
    albums: Array<{
      id: string;
      title: string;
      subtitle: string;
      content: string;
      dateLabel?: string;
      coverImage: ImageResource;
      images: Array<ImageResource & { allowDownload: boolean }>;
    }>;
  } | null;
}

function mapHighlightMomentsSection(
  section: NonNullable<ActivitiesDto['highlightMoments']>,
): HighlightMomentsView {
  return {
    title: section.title,
    subtitle: '',
    albums: section.albums.map((album) => ({
      id: album.id,
      title: album.title,
      subtitle: album.subtitle,
      dateLabel: album.dateLabel ?? '',
      coverImage: toAssetUrl(album.coverImage),
      imageCount: album.images.length,
    })),
  };
}

function mapHighlightMomentAlbumDetail(
  album: NonNullable<ActivitiesDto['highlightMoments']>['albums'][number],
): HighlightMomentAlbumDetailView {
  return {
    id: album.id,
    title: album.title,
    subtitle: album.subtitle,
    content: album.content ?? '',
    dateLabel: album.dateLabel ?? '',
    coverImage: toAssetUrl(album.coverImage),
    images: album.images.map((image) => ({
      url: toAssetUrl(image),
      allowDownload: image.allowDownload === true,
    })),
  };
}

function mapEventNavItem(item: ActivitiesDto['items'][number]): CompanyEventNavItem {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    icon: toAssetUrl(item.icon),
    iconBg: item.iconBg,
    path: item.path,
  };
}

function getActivitiesDto(): Promise<ActivitiesDto> {
  return withRequestCache('kb-life:activities', 2 * 60_000, () =>
    get<ActivitiesDto>(API_ENDPOINTS.kbLifeActivities),
  );
}

export async function getCompanyActivities(): Promise<{
  live: boolean;
  items: CompanyEventNavItem[];
  outingsMeta: { title: string; subtitle: string };
  annualDinner: AnnualDinnerView | null;
  outings: OutingActivityView[];
  health: HealthCheckupView | null;
  highlightMoments: HighlightMomentsView | null;
}> {
  const data = await getActivitiesDto();
  return {
    live: data.live === true,
    items: data.items.map(mapEventNavItem),
    outingsMeta: data.outingsMeta,
    annualDinner: data.annualDinner,
    outings: data.outings,
    health: data.health
      ? {
          title: data.health.title,
          subtitle: data.health.subtitle,
          pdfUrl: data.health.pdfUrl ? toAssetUrl(data.health.pdfUrl) : '',
          pdfFileName: data.health.pdfFileName ?? '',
          images: data.health.images.map((image) => toAssetUrl(image)),
        }
      : null,
    highlightMoments: data.highlightMoments ? mapHighlightMomentsSection(data.highlightMoments) : null,
  };
}

export async function getHighlightMomentAlbum(
  albumId: string,
): Promise<HighlightMomentAlbumDetailView | null> {
  const data = await getActivitiesDto();
  const album = data.highlightMoments?.albums.find((item) => item.id === albumId);
  return album ? mapHighlightMomentAlbumDetail(album) : null;
}
