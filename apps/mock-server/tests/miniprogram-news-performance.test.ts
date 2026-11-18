import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

describe('news first-screen loading', () => {
  it('starts the first news request before categories finish loading', async () => {
    let resolveCategories: ((value: unknown[]) => void) | undefined;
    const getNewsCategories = vi.fn(
      () =>
        new Promise<unknown[]>((resolvePromise) => {
          resolveCategories = resolvePromise;
        }),
    );
    let pageConfig: Record<string, unknown> = {};
    const source = readFileSync(
      resolve(__dirname, '../../miniprogram/miniprogram/pages/news/index.ts'),
      'utf8',
    );

    runInNewContext(
      ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2017,
          module: ts.ModuleKind.CommonJS,
        },
      }).outputText,
      {
        exports: {},
        Page: (value: Record<string, unknown>) => {
          pageConfig = value;
        },
        require: (id: string) => {
          if (id === './news.service') {
            return {
              getNewsCategories,
              getNewsList: vi.fn(),
              prefetchNewsDetails: vi.fn(),
            };
          }
          if (id === '../../types/api') {
            return { RequestError: Error };
          }
          if (id === '../../utils/format') {
            return { fallbackImageUrl: (url: string) => url };
          }
          if (id === '../../utils/friendly-page-error') {
            return {
              friendlyUnavailablePageData: () => ({}),
              logPageLoadIssue: vi.fn(),
            };
          }
          throw new Error(`Unexpected dependency: ${id}`);
        },
      },
    );

    const loadNews = vi.fn(async () => undefined);
    const context = {
      data: { pageAlive: true },
      loadNews,
      setData: vi.fn(),
    };
    const bootstrap = pageConfig.bootstrap as (this: typeof context) => Promise<void>;
    const pending = bootstrap.call(context);

    expect(getNewsCategories).toHaveBeenCalledOnce();
    expect(loadNews).toHaveBeenCalledWith(true);

    resolveCategories?.([]);
    await pending;
  });
});
