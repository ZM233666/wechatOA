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
  })
  .superRefine((value, ctx) => {
    if (value.MOCK_DELAY_MAX < value.MOCK_DELAY_MIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MOCK_DELAY_MAX'],
        message: `MOCK_DELAY_MAX (${value.MOCK_DELAY_MAX}) 必须大于或等于 MOCK_DELAY_MIN (${value.MOCK_DELAY_MIN})`,
      });
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
