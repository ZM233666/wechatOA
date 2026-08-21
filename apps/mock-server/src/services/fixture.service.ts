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
import { logError } from '../utils/logger';

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
    shuttleByLocation[location] = readJsonFile(`${base}/shuttle.json`, shuttleSchema);
    campusMapByLocation[location] = readJsonFile(`${base}/campus-map.json`, campusMapSchema);
    holidayByLocation[location] = readJsonFile(`${base}/holiday.json`, holidayCalendarSchema);
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
    readJsonFile(file, insightReportSchema),
  );
  const wetalkIssues = listJsonFiles('kb-life/wetalk')
    .map((file) => readJsonFile(file, wetalkIssueSchema))
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
  return store;
}

export function getFixtures(): MockFixtureStore {
  if (!store) {
    store = loadFixtures();
  }
  return store;
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

export function collectAssetPaths(value: unknown, bucket = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetPaths(item, bucket));
    return bucket;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      if ((key === 'url' || key === 'imageUrl') && typeof nested === 'string' && nested.startsWith('/mock-assets/')) {
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
  if (data.newsCategories.length < 3) errors.push('新闻分类少于 3 个');
  if (data.newsList.length < 8) errors.push('公开新闻摘要少于 8 条');
  if (data.newsArticles.filter((item) => item.status === 'published').length < 8) {
    errors.push('已发布新闻文章少于 8 篇');
  }
  if (data.products.length < 6) errors.push('产品少于 6 条');
  if (data.productDetails.length < 6) errors.push('产品详情少于 6 条');
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
    if (article && !article.placement.showOnHome) {
      errors.push(`首页最新资讯 ${item.id} 未标记 showOnHome`);
    }
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
    const absolute = path.join(PUBLIC_DIR, assetPath.replace(/^\//, ''));
    if (!fs.existsSync(absolute)) {
      errors.push(`静态资源不存在: ${assetPath} -> ${absolute}`);
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
