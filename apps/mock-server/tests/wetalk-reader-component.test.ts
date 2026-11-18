import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const mini = resolve(__dirname, '../../miniprogram/miniprogram');
class TestError extends Error {}
const image = vi.fn();
const insight = vi.fn();
const wetalk = vi.fn();
const map = vi.fn();
interface Context {
  data: Record<string, unknown>;
  properties: Record<string, unknown>;
  setData: (patch: Record<string, unknown>, cb?: () => void) => void;
  [name: string]: unknown;
}
function component(file: string, source = 'insights') {
  let definition: { data: Record<string, unknown>; methods: Record<string, unknown> } = { data: {}, methods: {} };
  const requires: Record<string, unknown> = {
    '../../../services/wetalk.service': { downloadWetalkReaderImage: image },
    '../../../services/services.service': { getInsightReport: insight },
    '../../../services/kb-life.service': { getWetalkIssueAsReport: wetalk, getCampusMapAsReport: map },
    '../../../types/api': { RequestError: TestError },
  };
  runInNewContext(ts.transpileModule(readFileSync(resolve(mini, file), 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
  } }).outputText, {
    exports: {}, require: (id: string) => { if (!(id in requires)) throw new Error(id); return requires[id]; },
    Component: (value: typeof definition) => { definition = value; },
    wx: { getWindowInfo: () => ({ windowWidth: 375, windowHeight: 800, screenHeight: 800, statusBarHeight: 20 }),
      getMenuButtonBoundingClientRect: () => ({ top: 24, height: 32 }) },
    setTimeout: (callback: () => void) => { callback(); return 0; },
  });
  const context: Context = {
    data: JSON.parse(JSON.stringify(definition.data)),
    properties: { source, fillParent: true, visible: true, hasNavBar: false, withTabBar: false },
    setData(patch, callback) { Object.assign(this.data, patch); callback?.(); },
  };
  Object.assign(context, definition.methods);
  return context;
}
async function call(context: Context, method: string, ...args: unknown[]) {
  return (context[method] as (...args: unknown[]) => Promise<void>).apply(context, args);
}
const reader = 'components/services/insight-reader/index.ts';
const page = 'components/services/insight-reader/reader-page.ts';
const report = { id: 'report', title: 'unit', image: '', pages: [
  { id: '1', type: 'sheet', coverImage: '/one.png' }, { id: '2', type: 'sheet', coverImage: '/two.png' },
] };
beforeEach(() => vi.resetAllMocks());

describe('existing reader remains shared by Insights, map and live WeTalk', () => {
  it('retains Insights book mode, ordered pages, navigation and thumb jump behavior', async () => {
    insight.mockResolvedValue(report); const c = component(reader);
    await call(c, 'loadReport', 'report');
    expect(insight).toHaveBeenCalledWith('report'); expect(wetalk).not.toHaveBeenCalled();
    expect(c.data).toMatchObject({ pageStatus: 'success', isBookMode: true, isMapMode: false, current: 0, canNext: true });
    await call(c, 'playFlip', 'next'); expect(c.data).toMatchObject({ current: 1, canPrev: true, canNext: false });
    await call(c, 'playFlip', 'prev', 0); expect(c.data.current).toBe(0);
  });
  it('retains separate map mode rather than forcing every sheet into a book', async () => {
    map.mockResolvedValue(report); const c = component(reader, 'campus-map');
    await call(c, 'loadReport', 'Suzhou');
    expect(map).toHaveBeenCalledWith('Suzhou'); expect(c.data).toMatchObject({ isMapMode: true, isBookMode: false });
  });
  it.each(['news:12','emagazine:12'])('passes the complete WeTalk type-qualified reader ID: %s', async id => {
    wetalk.mockResolvedValue({ ...report, id }); const c = component(reader, 'wetalk');
    await call(c, 'loadReport', id);
    expect(wetalk).toHaveBeenCalledWith(id); expect(insight).not.toHaveBeenCalled();
    expect(c.data).toMatchObject({ pageStatus: 'success', isBookMode: true });
  });
  it('shows a finite error state when rendering or authorization fails', async () => {
    wetalk.mockRejectedValue(new TestError('conversion failed')); const c = component(reader, 'wetalk');
    await call(c, 'loadReport', 'news:12');
    expect(c.data).toMatchObject({ pageStatus: 'error', errorText: 'conversion failed' });
  });
});
describe('authenticated WeTalk images do not change ordinary Insights/map images', () => {
  it('does not download normal sheet images through the new protected path', async () => {
    const c = component(page); c.properties.page = { type: 'sheet', coverImage: '/normal.png' };
    await call(c, 'loadProtectedImage'); expect(image).not.toHaveBeenCalled(); expect(c.data.imageLoading).toBe(false);
  });
  it('fails missing protected image addresses without an infinite loading state', async () => {
    const c = component(page); c.properties.page = { protectedImage: true, coverImage: '' };
    await call(c, 'loadProtectedImage');
    expect(c.data).toMatchObject({ imageLoading: false, imageError: '阅读页地址缺失，请重新打开' });
    expect(image).not.toHaveBeenCalled();
  });
  it('loads protected image content as an authenticated temporary local file', async () => {
    image.mockResolvedValue('/tmp/unit-page.png'); const c = component(page);
    c.properties.page = { protectedImage: true, coverImage: '/api/wetalk/news/12/reader/pages/version/1' };
    await call(c, 'loadProtectedImage'); expect(c.data).toMatchObject({ protectedImagePath: '/tmp/unit-page.png', imageLoading: false });
  });
  it('displays a retryable image error and recovers when the user retries', async () => {
    image.mockRejectedValueOnce(new TestError('page failed')).mockResolvedValueOnce('/tmp/retry.png');
    const c = component(page); c.properties.page = { protectedImage: true, coverImage: '/unit' };
    await call(c, 'loadProtectedImage'); expect(c.data).toMatchObject({ imageLoading: false, imageError: 'page failed' });
    await call(c, 'onRetryImage'); expect(c.data).toMatchObject({ protectedImagePath: '/tmp/retry.png', imageError: '' });
  });
  it('does not display a stale image completion after a page changes', async () => {
    let finish!: (path: string) => void;
    image.mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }))
      .mockResolvedValueOnce('/tmp/current.png');
    const c = component(page); c.properties.page = { protectedImage: true, coverImage: '/old' };
    const first = call(c, 'loadProtectedImage'); c.properties.page = { protectedImage: true, coverImage: '/current' };
    await call(c, 'loadProtectedImage'); finish('/tmp/old.png'); await first;
    expect(c.data.protectedImagePath).toBe('/tmp/current.png');
  });
});

describe('WeTalk entry points no longer default to system document preview', () => {
  it.each(['index','magazine','detail'])('%s mounts the existing source=wetalk reader without openDocument', name => {
    const source = readFileSync(resolve(mini, `subpackages/kb-life/wetalk/${name}.ts`), 'utf8');
    const template = readFileSync(resolve(mini, `subpackages/kb-life/wetalk/${name}.wxml`), 'utf8');
    expect(source).not.toMatch(/openWetalkPdf|openRemotePdf|openDocument/);
    expect(template).toContain('<insight-reader'); expect(template).toContain('source="wetalk"');
  });
});
