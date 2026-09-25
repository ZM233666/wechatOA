import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.example') });

const SCENARIOS = ['normal', 'empty', 'error', 'slow', 'unauthorized', 'not-found'] as const;

export type MockScenario = (typeof SCENARIOS)[number];

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    MOCK_HOST: z.string().min(1).default('0.0.0.0'),
    MOCK_PORT: z.coerce.number().int().min(1).max(65535).default(3100),
    API_PREFIX: z.string().min(1).default('/api'),
    MOCK_PUBLIC_BASE_URL: z.string().optional().default(''),
    MOCK_DELAY_ENABLED: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('true')
      .transform((value) => value === true || value === 'true' || value === '1'),
    MOCK_DELAY_MIN: z.coerce.number().int().min(0).default(100),
    MOCK_DELAY_MAX: z.coerce.number().int().min(0).default(350),
    MOCK_DEFAULT_SCENARIO: z.enum(SCENARIOS).default('normal'),
    CORS_ORIGINS: z.string().min(1).default('*'),
    MINIO_ENABLED: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
    MINIO_ENDPOINT: z.string().min(1).default('127.0.0.1'),
    MINIO_PORT: z.coerce.number().int().min(1).max(65535).default(9000),
    MINIO_USE_SSL: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
    MINIO_ACCESS_KEY: z.string().default(''),
    MINIO_SECRET_KEY: z.string().default(''),
    MINIO_BUCKET: z.string().min(1).default('wechat-official-account'),
    /** KB Insights PDF 前缀，对应 bucket 内路径如 kb-insights/ */
    MINIO_INSIGHTS_PREFIX: z.string().default('kb-insights/'),
    MINIO_WETALK_PREFIX: z.string().default('wetalk/'),
    MINIO_SUZHOU_CAMPUS_MAP_PREFIX: z.string().default('suzhou/campus-map/'),
    MINIO_SUZHOU_SHUTTLE_BUS_PREFIX: z.string().default('suzhou/shuttle-bus/'),
    NEWS_ARTICLE_ENABLED: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
    NEWS_ARTICLE_API_BASE_URL: z.string().min(1).default('http://127.0.0.1:8000'),
    NEWS_ARTICLE_MEDIA_BASE_URL: z.string().default('http://127.0.0.1:8000'),
    NEWS_ARTICLE_USERNAME: z.string().default('superadmin'),
    NEWS_ARTICLE_PASSWORD: z.string().default('admin123456'),
    NEWS_ARTICLE_INCLUDE_DRAFTS: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
    NEWS_ARTICLE_LIMIT: z.coerce.number().int().min(1).max(200).default(50),
    NEWS_ARTICLE_MAX_IMAGES: z.coerce.number().int().min(1).max(200).default(40),
    BRAND_INTRO_ENABLED: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
    BRAND_INTRO_API_BASE_URL: z.string().min(1).default('http://127.0.0.1:8000'),
    BRAND_INTRO_MEDIA_BASE_URL: z.string().default('http://127.0.0.1:8000'),
    BRAND_INTRO_PUBLIC_PATH: z
      .string()
      .min(1)
      .default('/api/brand-intro/intro/public/current/'),
    BRAND_INTRO_TRY_PUBLIC: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('true')
      .transform((value) => value === true || value === 'true' || value === '1'),
    BRAND_INTRO_USERNAME: z.string().default('superadmin'),
    BRAND_INTRO_PASSWORD: z.string().default('admin123456'),
    PRODUCT_INTRO_ENABLED: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
    PRODUCT_INTRO_API_BASE_URL: z.string().min(1).default('http://127.0.0.1:8000'),
    PRODUCT_INTRO_MEDIA_BASE_URL: z.string().default('http://127.0.0.1:8000'),
    PRODUCT_INTRO_TRY_PUBLIC: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('true')
      .transform((value) => value === true || value === 'true' || value === '1'),
    PRODUCT_INTRO_USERNAME: z.string().default('superadmin'),
    PRODUCT_INTRO_PASSWORD: z.string().default('admin123456'),
    PROJECT_CASE_ENABLED: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
    PROJECT_CASE_API_BASE_URL: z.string().min(1).default('http://127.0.0.1:8000'),
    PROJECT_CASE_MEDIA_BASE_URL: z.string().default('http://127.0.0.1:8000'),
    PROJECT_CASE_USERNAME: z.string().default('superadmin'),
    PROJECT_CASE_PASSWORD: z.string().default('admin123456'),
    PROJECT_CASE_LIMIT: z.coerce.number().int().min(1).max(200).default(100),
    /** Django 等上游单次超时，须小于小程序默认 15s，便于失败后回退缓存/fixture */
    LIVE_API_TIMEOUT_MS: z.coerce.number().int().min(1000).max(20_000).default(5000),
    LUNCH_MENU_ENABLED: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
    LUNCH_MENU_API_BASE_URL: z.string().min(1).default('http://127.0.0.1:8000'),
    LUNCH_MENU_USERNAME: z.string().default('superadmin'),
    LUNCH_MENU_PASSWORD: z.string().default('admin123456'),
    SHUTTLE_SCHEDULE_ENABLED: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
    SHUTTLE_SCHEDULE_API_BASE_URL: z.string().min(1).default('http://127.0.0.1:8000'),
    SHUTTLE_SCHEDULE_USERNAME: z.string().default('superadmin'),
    SHUTTLE_SCHEDULE_PASSWORD: z.string().default('admin123456'),
    /** 腾讯位置服务 WebService Key，用于目的地解析与步行/骑行/公交路线规划 */
    TENCENT_MAP_KEY: z.string().default(''),
    /** 勾选 Key 的 SN 校验后生成的 SecretKey（服务端调用推荐，勿提交到仓库） */
    TENCENT_MAP_SK: z.string().default(''),
    /** 仅当控制台对该 Key 启用了 SN 校验时设为 true；误填 SK 会导致「参数错误」 */
    TENCENT_MAP_USE_SN: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .default('false')
      .transform((value) => value === true || value === 'true' || value === '1'),
  })
  .superRefine((value, ctx) => {
    if (value.MOCK_DELAY_MAX < value.MOCK_DELAY_MIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MOCK_DELAY_MAX'],
        message: `MOCK_DELAY_MAX (${value.MOCK_DELAY_MAX}) 必须大于或等于 MOCK_DELAY_MIN (${value.MOCK_DELAY_MIN})`,
      });
    }
    if (value.MINIO_ENABLED) {
      if (!value.MINIO_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MINIO_ACCESS_KEY'],
          message: 'MINIO_ENABLED=true 时必须提供 MINIO_ACCESS_KEY',
        });
      }
      if (!value.MINIO_SECRET_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MINIO_SECRET_KEY'],
          message: 'MINIO_ENABLED=true 时必须提供 MINIO_SECRET_KEY',
        });
      }
    }
  });

export type MockEnv = z.infer<typeof envSchema>;

function formatEnvError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.join('.') || 'env';
      return `${field}: ${issue.message}`;
    })
    .join('\n');
}

export function loadEnv(overrides: Record<string, string | undefined> = {}): MockEnv {
  const parsed = envSchema.safeParse({
    ...process.env,
    ...overrides,
  });

  if (!parsed.success) {
    throw new Error(`Mock Server 环境变量校验失败:\n${formatEnvError(parsed.error)}`);
  }

  const env = parsed.data;
  env.API_PREFIX = env.API_PREFIX.startsWith('/') ? env.API_PREFIX : `/${env.API_PREFIX}`;
  env.MOCK_PUBLIC_BASE_URL = env.MOCK_PUBLIC_BASE_URL.replace(/\/+$/, '');
  return env;
}

export const mockEnv = loadEnv();

export function isMockScenario(value: string): value is MockScenario {
  return (SCENARIOS as readonly string[]).includes(value);
}
