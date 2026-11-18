import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestCalls: Array<Record<string, unknown>> = [];

class TestRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly data?: unknown,
    readonly code?: string,
  ) {
    super(message);
  }
}

const source = readFileSync(
  resolve(__dirname, '../../miniprogram/miniprogram/services/request.ts'),
  'utf8',
);
const serviceExports = {} as {
  get: <T>(url: string, data?: Record<string, unknown>) => Promise<T>;
  withStaleWhileRevalidate: <T>(
    key: string,
    freshTtlMs: number,
    staleTtlMs: number,
    loader: () => Promise<T>,
  ) => Promise<T>;
};

runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText,
  {
    exports: serviceExports,
    console,
    require: (id: string) => {
      if (id === '../config/env') {
        return {
          getApiEnvironment: () => ({
            apiBaseUrl: 'https://api.test',
            timeout: 15_000,
            enableDebugLog: false,
            dataSource: 'mock-server',
            mockScenario: '',
          }),
          getCurrentEnvVersion: () => 'develop',
          isForbiddenProductionApiBaseUrl: () => false,
        };
      }
      if (id === '../types/api') {
        return { RequestError: TestRequestError };
      }
      if (id === './auth-session') {
        return {
          buildAuthorizationHeader: () => ({ Authorization: 'Bearer test' }),
          clearAccessToken: vi.fn(),
        };
      }
      throw new Error(`Unexpected dependency: ${id}`);
    },
    wx: {
      request: (options: Record<string, unknown>) => {
        requestCalls.push(options);
      },
    },
  },
);

describe('miniprogram GET in-flight dedupe', () => {
  beforeEach(() => {
    requestCalls.length = 0;
  });

  it('shares an identical pending GET and releases it after completion', async () => {
    const first = serviceExports.get<{ id: number }>('/items', { page: 1 });
    const second = serviceExports.get<{ id: number }>('/items', { page: 1 });

    expect(second).toBe(first);
    expect(requestCalls).toHaveLength(1);

    const success = requestCalls[0].success as (result: unknown) => void;
    success({ statusCode: 200, data: { success: true, data: { id: 1 } } });
    await expect(first).resolves.toEqual({ id: 1 });
    await Promise.resolve();

    void serviceExports.get('/items', { page: 1 });
    expect(requestCalls).toHaveLength(2);
  });
});

describe('miniprogram stale-while-revalidate cache', () => {
  it('returns stale data immediately while refreshing it in the background', async () => {
    let resolveRefresh: ((value: string) => void) | undefined;
    const loader = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('cached')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );

    await expect(
      serviceExports.withStaleWhileRevalidate('swr:test', 0, 60_000, loader),
    ).resolves.toBe('cached');
    await expect(
      serviceExports.withStaleWhileRevalidate('swr:test', 0, 60_000, loader),
    ).resolves.toBe('cached');
    expect(loader).toHaveBeenCalledTimes(2);

    resolveRefresh?.('fresh');
    await Promise.resolve();
  });
});
