import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
import { resolve } from 'node:path';
const miniRoot = resolve(__dirname, '../../miniprogram/miniprogram');

// Load the real frontend service through its emitted CommonJS code. Do not import the
// mini-program TS tree into mock-server's rootDir (its wx types belong to its own tsconfig).
const request = vi.fn();
const downloadFile = vi.fn();
let loginCode = 'test-only-code';
let clock = Date.now();
const openRemotePdf = vi.fn();
class TestRequestError extends Error {
  constructor(message: string, readonly statusCode?: number) { super(message); }
}
const endpoints = {
  kbLifeWetalk: '/api/wetalk/news/', kbLifeWetalkMagazines: '/api/wetalk/emagazines/',
  kbLifeWetalkReader: (resource: string, id: string) => `/api/wetalk/${resource}/${id}/reader`,
  kbLifeWetalkReaderPage: (resource: string, id: string, version: string, page: number) => `/api/wetalk/${resource}/${id}/reader/pages/${version}/${page}`,
  kbLifeWetalkDetail: (id: string) => `/api/wetalk/news/${id}/`,
  kbLifeWetalkMagazineDetail: (id: string) => `/api/wetalk/emagazines/${id}/`,
  kbLifeWetalkCover: (resource: string, id: string) => `/api/wetalk/${resource}/${id}/cover`,
};
const dependencies: Record<string, unknown> = {
  '../config/env': {
    getApiEnvironment: () => ({ apiBaseUrl: 'http://bff.test' }),
    getApiBaseUrl: () => 'http://bff.test',
    getCurrentEnvVersion: () => 'develop',
    isForbiddenProductionApiBaseUrl: () => false,
  },
  './request': { get: request }, './endpoints': { API_ENDPOINTS: endpoints },
  './identity-binding.service': { getLoginCodeQueryParams: async () => ({ loginCode }) },
  '../utils/open-remote-pdf': { openRemotePdf }, '../types/api': { RequestError: TestRequestError },
};
const serviceSource = readFileSync(resolve(miniRoot, 'services/wetalk.service.ts'), 'utf8');
const serviceExports = {} as {
  getWetalkIssues: () => Promise<Array<Record<string, unknown>>>;
  getWetalkMagazines: () => Promise<Array<Record<string, unknown>>>;
  getWetalkDetail: (type: string, id: string) => Promise<Record<string, unknown>>;
  openWetalkPdf: (type: string, id: string) => Promise<void>;
  getWetalkBook: (type: string, id: string) => Promise<{ id: string; pages: Array<Record<string, unknown>> }>;
  downloadWetalkReaderImage: (path: string) => Promise<string>;
};
runInNewContext(ts.transpileModule(serviceSource, { compilerOptions: {
  target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
} }).outputText, {
  exports: serviceExports,
  wx: { downloadFile },
  Date: { now: () => clock },
  require: (id: string) => {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  },
});
const { getWetalkIssues, getWetalkMagazines, getWetalkDetail, openWetalkPdf } = serviceExports;
const item = { id: 12, type: 'news', title: 'test', volumeNo: '2024-01', summary: '', author: '',
  coverUrl: 'https://assets.test/cover.png', pdfUrl: 'https://assets.test/report.pdf',
  pdfFileName: 'report.pdf', publishTime: '2026-03-16T10:00:00+08:00', views: 0 };
beforeEach(() => { vi.clearAllMocks(); loginCode = 'test-only-code'; clock = Date.now(); });

describe('WeTalk frontend public contract', () => {
  it('maps camelCase cover/date/volume/type and retains no PDF URL in list cards', async () => {
    request.mockResolvedValueOnce({ items: [item], total: 1, page: 1, limit: 50 });
    const cards = await getWetalkIssues();
    expect(cards).toEqual([{ id: '12', type: 'news', title: 'test', volumeNo: '2024-01',
      date: item.publishTime, image: item.coverUrl, kind: 'pdf', kindLabel: 'PDF' }]);
    expect(cards[0]).not.toHaveProperty('pdfUrl');
    expect(request).toHaveBeenCalledWith('/api/wetalk/news/', { page: 1, limit: 50 }, { 'X-Login-Code': 'test-only-code' });
  });
  it('maps weak PDF covers to the protected cover endpoint with loginCode', async () => {
    request.mockResolvedValueOnce({
      items: [{ ...item, coverUrl: '', pdfUrl: 'https://assets.test/report.pdf' }],
      total: 1,
      page: 1,
      limit: 50,
    });
    const cards = await getWetalkIssues();
    expect(cards[0]?.image).toBe(
      'http://bff.test/api/wetalk/news/12/cover?loginCode=test-only-code',
    );
  });
  it('fetches all pages so existing year filters do not silently lose older issues', async () => {
    request.mockResolvedValueOnce({ items: [item], total: 2, page: 1, limit: 50 })
      .mockResolvedValueOnce({ items: [{ ...item, id: 13 }], total: 2, page: 2, limit: 50 });
    expect(await getWetalkIssues()).toHaveLength(2);
    expect(request).toHaveBeenLastCalledWith('/api/wetalk/news/', { page: 2, limit: 50 }, { 'X-Login-Code': 'test-only-code' });
  });
  it('reads emagazines separately and maps volumeNo', async () => {
    request.mockResolvedValueOnce({ items: [{ ...item, type: 'emagazine' }], total: 1, page: 1, limit: 50 });
    expect((await getWetalkMagazines())[0]).toMatchObject({ volumeNo: '2024-01', type: 'emagazine' });
    expect(request.mock.calls[0][0]).toBe('/api/wetalk/emagazines/');
  });
  it('preserves empty lists', async () => {
    request.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    await expect(getWetalkIssues()).resolves.toEqual([]);
  });
  it('retains News metadata when the backend has no PDF attachment', async () => {
    request.mockResolvedValueOnce({ items: [{ ...item, pdfUrl: '' }], total: 1, page: 1, limit: 50 });
    expect((await getWetalkIssues())[0]).toMatchObject({ id: '12', kind: 'article', kindLabel: 'News' });
  });
  it('rejects an absent PDF clearly without attempting a download', async () => {
    request.mockResolvedValueOnce({ ...item, pdfUrl: '' });
    await expect(openWetalkPdf('news', '12')).rejects.toThrow('暂无 PDF 文件');
    expect(openRemotePdf).not.toHaveBeenCalled();
  });
  it('does not silently discard incompatible shapes', async () => {
    request.mockResolvedValueOnce({ items: {}, total: 1, page: 1, limit: 50 });
    await expect(getWetalkIssues()).rejects.toThrow('响应格式错误');
  });
  it('rejects a mismatched content type or detail ID', async () => {
    request.mockResolvedValueOnce({ ...item, type: 'emagazine' });
    await expect(getWetalkDetail('news', '12')).rejects.toThrow('响应格式错误');
    request.mockResolvedValueOnce({ ...item, id: 13 });
    await expect(getWetalkDetail('news', '12')).rejects.toThrow('ID 不匹配');
  });
  it('does not open a cached/list PDF; every click fetches the matching latest detail', async () => {
    request.mockResolvedValueOnce(item).mockResolvedValueOnce({ ...item, pdfUrl: 'https://assets.test/fresh.pdf' });
    await openWetalkPdf('news', '12'); await openWetalkPdf('news', '12');
    expect(request).toHaveBeenCalledTimes(2);
    expect(openRemotePdf).toHaveBeenNthCalledWith(1, item.pdfUrl);
    expect(openRemotePdf).toHaveBeenNthCalledWith(2, 'https://assets.test/fresh.pdf');
  });
  it('refreshes the emagazine detail before preview', async () => {
    request.mockResolvedValueOnce({ ...item, type: 'emagazine' });
    await openWetalkPdf('emagazine', '12');
    expect(request.mock.calls[0][0]).toBe('/api/wetalk/emagazines/12/');
  });
  it('propagates 404/failure without opening a PDF or falling back to fixtures', async () => {
    request.mockRejectedValueOnce(new Error('not found'));
    await expect(openWetalkPdf('news', '12')).rejects.toThrow('not found');
    expect(openRemotePdf).not.toHaveBeenCalled();
  });
});

describe('WeChat compiler regression guard (not a DevTools GUI execution)', () => {
  it.each(['index', 'magazine'])('%s source and ES2017 output do not contain array spread triggering toConsumableArray', page => {
    const source = readFileSync(resolve(miniRoot, `subpackages/kb-life/wetalk/${page}.ts`), 'utf8');
    const ast = ts.createSourceFile(`${page}.ts`, source, ts.ScriptTarget.Latest, true);
    let spreads = 0;
    function visit(node: ts.Node) { if (ts.isSpreadElement(node)) spreads++; ts.forEachChild(node, visit); }
    visit(ast); expect(spreads).toBe(0);
    const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS } }).outputText;
    expect(output).not.toMatch(/\.\.\.|toConsumableArray|arrayWithoutHoles/);
  });
  it('registers the magazine subpackage page and uses the existing book reader dependency', () => {
    const root = miniRoot;
    const app = JSON.parse(readFileSync(resolve(root, 'app.json'), 'utf8'));
    expect(app.subPackages.find((p: { root: string }) => p.root === 'subpackages/kb-life').pages).toContain('wetalk/magazine');
    for (const page of ['index', 'magazine']) {
      const config = JSON.parse(readFileSync(resolve(root, `subpackages/kb-life/wetalk/${page}.json`), 'utf8'));
      expect(config.usingComponents).toHaveProperty('insight-reader', '/components/services/insight-reader/index');
    }
  });
});


describe('WeTalk page return freshness', () => {
  it.each(['index', 'magazine', 'detail'])('%s refreshes stale display URLs on return without duplicating initial load', page => {
    const source = readFileSync(resolve(miniRoot, `subpackages/kb-life/wetalk/${page}.ts`), 'utf8');
    let config: Record<string, unknown> = {};
    const gate = vi.fn(() => false);
    runInNewContext(ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
    } }).outputText, {
      exports: {}, Page: (value: Record<string, unknown>) => { config = value; },
      require: (id: string) => {
        if (id.endsWith('/services/wetalk.service')) return serviceExports;
        if (id.endsWith('/types/api')) return { RequestError: TestRequestError };
        if (id.endsWith('/utils/identity-access')) return { rejectEmployeeOnlyAccess: gate };
        throw new Error(`Unexpected page dependency: ${id}`);
      },
    });
    const load = vi.fn();
    const context = { data: { pageStatus: 'success', articleId: '12' }, loadList: load, loadArticle: load };
    const onShow = config.onShow as (this: typeof context) => void;
    onShow.call(context); expect(load).toHaveBeenCalledTimes(1);
    load.mockClear(); context.data.pageStatus = 'loading';
    onShow.call(context); expect(load).not.toHaveBeenCalled();
    context.data.pageStatus = 'success'; gate.mockReturnValueOnce(true);
    onShow.call(context); expect(load).not.toHaveBeenCalled();
  });
});


describe('WeTalk book manifest frontend adapter', () => {
  const version = 'a'.repeat(64);
  const book = { id: 12, type: 'news', title: 'test', volumeNo: '2024-01', publishTime: '', coverUrl: '',
    version, pageCount: 2, pages: [{ number: 1, width: 600, height: 800 }, { number: 2, width: 600, height: 800 }] };
  it('maps real pages to protected same-BFF resources, with an explicit type-qualified reader ID', async () => {
    request.mockResolvedValueOnce(book);
    const report = await serviceExports.getWetalkBook('news', '12');
    expect(report.id).toBe('news:12'); expect(report.pages).toHaveLength(2);
    expect(report.pages[0]).toMatchObject({ type: 'sheet', protectedImage: true,
      coverImage: `/api/wetalk/news/12/reader/pages/${version}/1` });
    expect(request).toHaveBeenCalledWith('/api/wetalk/news/12/reader', undefined, { 'X-Login-Code': 'test-only-code' }, 90000);
  });
  it('isolates magazine IDs and refreshes the reader manifest on every opening', async () => {
    request.mockResolvedValue({ ...book, type: 'emagazine' });
    expect((await serviceExports.getWetalkBook('emagazine', '12')).id).toBe('emagazine:12');
    await serviceExports.getWetalkBook('emagazine', '12');
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toBe('/api/wetalk/emagazines/12/reader');
  });
  it.each([{ ...book, pages: [], pageCount: 0 }, { ...book, pages: book.pages.slice().reverse() },
    { ...book, type: 'emagazine' }, { ...book, version: '../private' }])('rejects invalid/empty/out-of-order manifests', async data => {
      request.mockResolvedValueOnce(data);
      await expect(serviceExports.getWetalkBook('news', '12')).rejects.toThrow('阅读清单格式错误');
    });
  it('rejects arbitrary download URLs instead of becoming an open proxy', async () => {
    await expect(serviceExports.downloadWetalkReaderImage('https://private.test/file')).rejects.toThrow('地址无效');
    await expect(serviceExports.downloadWetalkReaderImage('/api/../private')).rejects.toThrow('地址无效');
  });
});


describe('protected image download credentials', () => {
  const imagePath = `/api/wetalk/news/12/reader/pages/${'a'.repeat(64)}/1`;
  it('sends the existing login code as a header, never in the image URL', async () => {
    downloadFile.mockImplementationOnce((options: { success: (result: unknown) => void }) => options.success({ statusCode: 200, tempFilePath: '/tmp/authorized.png' }));
    await expect(serviceExports.downloadWetalkReaderImage(imagePath)).resolves.toBe('/tmp/authorized.png');
    expect(downloadFile.mock.calls[0][0]).toMatchObject({ url: `http://bff.test${imagePath}`, header: { 'X-Login-Code': 'test-only-code' }, timeout: 20000 });
    expect(downloadFile.mock.calls[0][0].url).not.toContain('test-only-code');
  });
  it('does not display rejected/private cached images after a 401 or an expired lease', async () => {
    downloadFile.mockImplementationOnce((options: { success: (result: unknown) => void }) => options.success({ statusCode: 401, tempFilePath: '/tmp/denied.png' }));
    await expect(serviceExports.downloadWetalkReaderImage(imagePath.replace(/1$/, '2'))).rejects.toMatchObject({ statusCode: 401 });
    downloadFile.mockImplementationOnce((options: { success: (result: unknown) => void }) => options.success({ statusCode: 410 }));
    await expect(serviceExports.downloadWetalkReaderImage(imagePath.replace(/1$/, '3'))).rejects.toThrow('阅读已过期');
  });
});


describe('short protected image reuse for smooth book turns', () => {
  const path = `/api/wetalk/news/12/reader/pages/${'b'.repeat(64)}/1`;
  it('reuses the next-page temporary file and deduplicates simultaneous foreground/under-page downloads', async () => {
    downloadFile.mockImplementationOnce((options: { success: (result: unknown) => void }) => options.success({ statusCode: 200, tempFilePath: '/tmp/preloaded.png' }));
    const [a,b] = await Promise.all([serviceExports.downloadWetalkReaderImage(path), serviceExports.downloadWetalkReaderImage(path)]);
    expect(a).toBe('/tmp/preloaded.png'); expect(b).toBe(a);
    expect(await serviceExports.downloadWetalkReaderImage(path)).toBe(a);
    expect(downloadFile).toHaveBeenCalledTimes(1);
  });
  it('does not reuse a temporary file across login identities or different content versions', async () => {
    const target = path.replace(/1$/, '2');
    downloadFile.mockImplementation((options: { success: (result: unknown) => void }) => options.success({ statusCode: 200, tempFilePath: '/tmp/scoped.png' }));
    await serviceExports.downloadWetalkReaderImage(target);
    loginCode = 'other-test-only-code'; await serviceExports.downloadWetalkReaderImage(target);
    await serviceExports.downloadWetalkReaderImage(target.replace('b'.repeat(64), 'c'.repeat(64)));
    expect(downloadFile).toHaveBeenCalledTimes(3);
  });
  it('refreshes temporary images after the short 30-second reuse window', async () => {
    const target = path.replace(/1$/, '3');
    downloadFile.mockImplementation((options: { success: (result: unknown) => void }) => options.success({ statusCode: 200, tempFilePath: '/tmp/fresh.png' }));
    await serviceExports.downloadWetalkReaderImage(target); clock += 31000;
    await serviceExports.downloadWetalkReaderImage(target); expect(downloadFile).toHaveBeenCalledTimes(2);
  });
});


describe('new protected reader code avoids nested Babel array helper triggers', () => {
  it.each(['services/wetalk.service.ts', 'components/services/insight-reader/reader-page.ts'])(
    '%s introduces neither array spread nor array-binding helper chains', file => {
      const ast = ts.createSourceFile(file, readFileSync(resolve(miniRoot, file), 'utf8'), ts.ScriptTarget.Latest, true);
      let unsafe = 0;
      function visit(node: ts.Node) {
        if (ts.isSpreadElement(node) || ts.isArrayBindingPattern(node)) unsafe++;
        ts.forEachChild(node, visit);
      }
      visit(ast); expect(unsafe).toBe(0);
    });
});
