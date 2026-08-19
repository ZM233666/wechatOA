import fs from 'node:fs';
import path from 'node:path';
import { z, type ZodType } from 'zod';
import type { AppConfig, ArticleDetail, CaseDetail, CaseSummary, HomeData, NewsSummary, ProductCategoriesData, ProductDetail, ProductSummary, ProfileData, ServiceDetail, ServicesPageData } from '@app/shared';
import { appConfigSchema, homeDataSchema } from '../schemas/home.schema';
import { brandOverviewFileSchema, type BrandOverview } from '../schemas/brand.schema';
import { newsArticleSchema, newsCategoriesSchema, newsListSchema } from '../schemas/news.schema';
import { caseCategorySchema, caseDetailSchema, caseSummarySchema } from '../schemas/case.schema';
import { productCategoriesFileSchema, productDetailSchema, productSummarySchema } from '../schemas/product.schema';
import { servicesFileSchema } from '../schemas/service.schema';
import { activitiesSchema, canteenSchema, kbLifeEntriesSchema, shuttleSchema } from '../schemas/kb-life.schema';
import { profileSchema } from '../schemas/profile.schema';
import { articleDetailSchema } from '../schemas/article.schema';
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

export interface MockFixtureStore {
  appConfig: AppConfig;
  home: HomeData;
  newsCategories: Array<{ id: string; name: string }>;
  newsList: NewsSummary[];
  newsArticles: ArticleDetail[];
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
  canteen: ReturnType<typeof canteenSchema.parse>;
  shuttle: ReturnType<typeof shuttleSchema.parse>;
  activities: ReturnType<typeof activitiesSchema.parse>;
  profileGuest: ProfileData;
  profileLoggedIn: ProfileData;
}

let store: MockFixtureStore | null = null;

export function loadFixtures(): MockFixtureStore {
  const appConfig = readJsonFile('app/config.json', appConfigSchema);
  const home = readJsonFile('home/home.json', homeDataSchema);
  const newsCategories = readJsonFile('news/categories.json', newsCategoriesSchema);
  const newsList = readJsonFile('news/list.json', newsListSchema);
  const newsArticles = listJsonFiles('news/articles').map((file) => readJsonFile(file, newsArticleSchema));
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
  const canteen = readJsonFile('kb-life/canteen.json', canteenSchema);
  const shuttle = readJsonFile('kb-life/shuttle.json', shuttleSchema);
  const activities = readJsonFile('kb-life/activities.json', activitiesSchema);
  const profileGuest = readJsonFile('profile/guest.json', profileSchema);
  const profileLoggedIn = readJsonFile('profile/logged-in.json', profileSchema);

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
    canteen,
    shuttle,
    activities,
    profileGuest,
    profileLoggedIn,
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
  if (data.newsList.length < 8) errors.push('新闻摘要少于 8 条');
  if (data.newsArticles.length < 8) errors.push('完整新闻文章少于 8 篇');
  if (data.products.length < 6) errors.push('产品少于 6 条');
  if (data.productDetails.length < 6) errors.push('产品详情少于 6 条');
  if (data.cases.length < 6) errors.push('案例少于 6 条');
  if (data.caseDetails.length < 6) errors.push('案例详情少于 6 条');

  data.newsList.forEach((item) => {
    if (!newsCategoryIds.has(item.category.id)) {
      errors.push(`新闻 ${item.id} 的分类 ${item.category.id} 不存在`);
    }
    if (!newsArticleIds.has(item.id)) {
      errors.push(`新闻列表 ${item.id} 缺少对应详情`);
    }
  });
  data.newsArticles.forEach((article) => {
    if (!newsListIds.has(article.id)) {
      errors.push(`新闻详情 ${article.id} 在列表中不存在`);
    }
    collectDuplicateBlockIds(article.richContent).forEach((blockId) => {
      errors.push(`新闻 ${article.id} 的 richContent block id 重复: ${blockId}`);
    });
    article.relatedIds.forEach((relatedId) => {
      if (!newsListIds.has(relatedId) && !newsArticleIds.has(relatedId)) {
        errors.push(`新闻 ${article.id} 的 relatedIds 引用了不存在的 ${relatedId}`);
      }
    });
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

  data.home.latestNews.forEach((item) => {
    if (!newsListIds.has(item.id)) {
      errors.push(`首页最新资讯 ${item.id} 在新闻列表中不存在`);
    }
    if (!newsArticleIds.has(item.id)) {
      errors.push(`首页最新资讯 ${item.id} 无法打开对应详情`);
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

  if (errors.length > 0) {
    const message = `Fixture 完整性校验失败:\n${errors.map((item) => `  - ${item}`).join('\n')}`;
    logError(message);
    throw new FixtureValidationError(message);
  }
}
