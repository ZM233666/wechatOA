import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWetalkBookService, downloadPublishedPdf, type PublishedPdf } from '../src/services/wetalk-book.service';

let root: string;
const item: PublishedPdf = { id: 12, type: 'news', title: 'unit', volumeNo: '', publishTime: '', coverUrl: '', pdfUrl: 'https://pdf.test/item.pdf?signature=first' };
function png(width = 600, height = 800): Buffer {
  const bytes = Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
  bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20); return bytes;
}
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'wetalk-book-test-')); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
function setup() {
  const detail = vi.fn(async (resource: string, _id: string, _code?: string): Promise<PublishedPdf> => {
    void _id; void _code; return { ...item, type: resource === 'news' ? 'news' : 'emagazine' };
  });
  const download = vi.fn(async (_url: string): Promise<Buffer> => { void _url; return Buffer.from('%PDF-first'); });
  const render = vi.fn(async (_pdf: string, dir: string) => {
    void _pdf; await fs.mkdir(dir); await fs.writeFile(path.join(dir, 'page-02.png'), png());
    await fs.writeFile(path.join(dir, 'page-01.png'), png());
  });
  let clock = Date.now();
  const service = createWetalkBookService({ root, detail, download, render, now: () => clock });
  return { service, detail, download, render, expire: () => { clock += 11 * 60_000; } };
}
describe('protected live WeTalk book service', () => {
  it('creates a nonempty ordered manifest with dimensions, without signatures/credentials', async () => {
    const { service } = setup(); const book = await service.manifest('news', '12', 'test-code');
    expect(book.pageCount).toBe(2); expect(book.pages.map(p => p.number)).toEqual([1, 2]);
    expect(book.pages[0]).toEqual({ number: 1, width: 600, height: 800 });
    expect(JSON.stringify(book)).not.toMatch(/signature|test-code|pdfUrl/);
    expect(await service.page('news', '12', book.version, 2, 'test-code')).toContain('page-02.png');
  });
  it('reuses the first rendered page as list cover', async () => {
    const { service } = setup();
    await expect(service.cover('news', '12', 'test-code')).resolves.toContain('page-01.png');
  });
  it('isolates identical numeric IDs and identical PDF bytes by News/Magazine type', async () => {
    const { service } = setup(); const news = await service.manifest('news', '12');
    const mag = await service.manifest('emagazines', '12'); expect(mag.version).not.toBe(news.version);
    await expect(service.page('emagazines', '12', news.version, 1)).rejects.toMatchObject({ status: 410 });
  });
  it('refreshes official signed URLs and bytes every opening but reuses rendered identical content', async () => {
    const { service, detail, download, render } = setup();
    const first = await service.manifest('news', '12');
    detail.mockResolvedValueOnce({ ...item, pdfUrl: 'https://pdf.test/item.pdf?signature=rotated' });
    const second = await service.manifest('news', '12');
    expect(second.version).toBe(first.version); expect(download).toHaveBeenCalledTimes(2);
    expect(download).toHaveBeenLastCalledWith('https://pdf.test/item.pdf?signature=rotated');
    expect(render).toHaveBeenCalledTimes(1);
  });
  it('does not strip query strings or collide private content versions', async () => {
    const { service, detail, download, render } = setup(); const first = await service.manifest('news', '12');
    detail.mockResolvedValueOnce({ ...item, pdfUrl: 'https://pdf.test/item.pdf?private-content=other' });
    download.mockResolvedValueOnce(Buffer.from('%PDF-different-private-content'));
    const second = await service.manifest('news', '12');
    expect(second.version).not.toBe(first.version); expect(render).toHaveBeenCalledTimes(2);
    await expect(service.page('news', '12', first.version, 1)).rejects.toMatchObject({ status: 410 });
  });
  it('forwards the current identity on both manifest and image access', async () => {
    const { service, detail } = setup(); const book = await service.manifest('news', '12', 'test-code');
    await service.page('news', '12', book.version, 1, 'test-code');
    expect(detail).toHaveBeenNthCalledWith(1, 'news', '12', 'test-code');
    expect(detail).toHaveBeenNthCalledWith(2, 'news', '12', 'test-code');
  });
  it('does not grant another/anonymous identity access just because the PDF is cached', async () => {
    const { service } = setup(); const book = await service.manifest('news', '12', 'test-code');
    await expect(service.page('news', '12', book.version, 1)).rejects.toMatchObject({ status: 410 });
    await expect(service.page('news', '12', book.version, 1, 'other-code')).rejects.toMatchObject({ status: 410 });
  });
  it.each([401,403,404])('denies cached pages when upstream gate/publication changes: %i', async status => {
    const { service, detail } = setup(); const book = await service.manifest('news', '12', 'test-code');
    detail.mockRejectedValueOnce(Object.assign(new Error('denied'), { status }));
    await expect(service.page('news', '12', book.version, 1, 'test-code')).rejects.toMatchObject({ status });
  });
  it('expires inactive reader access instead of exposing old cached images indefinitely', async () => {
    const { service, expire } = setup(); const book = await service.manifest('news', '12'); expire();
    await expect(service.page('news', '12', book.version, 1)).rejects.toMatchObject({ status: 410 });
  });
  it('does not invent pages for news without a PDF', async () => {
    const { service, detail, download, render } = setup(); detail.mockResolvedValueOnce({ ...item, pdfUrl: '' });
    await expect(service.manifest('news', '12')).rejects.toMatchObject({ status: 404 });
    expect(download).not.toHaveBeenCalled(); expect(render).not.toHaveBeenCalled();
  });
  it('rejects a mismatched official identity/type', async () => {
    const { service, detail } = setup(); detail.mockResolvedValueOnce({ ...item, id: 13 });
    await expect(service.manifest('news', '12')).rejects.toMatchObject({ status: 502 });
  });
  it('returns a sanitized rendering error and permits a later retry', async () => {
    const { service, render } = setup(); render.mockRejectedValueOnce(new Error('private source URL'));
    await expect(service.manifest('news', '12')).rejects.toMatchObject({ status: 502, message: 'PDF 转页失败或超过限制，请关闭后重新打开重试' });
    expect((await service.manifest('news', '12')).pages).toHaveLength(2);
  });
  it('rejects an empty render output rather than returning ready-zero', async () => {
    const { service, render } = setup(); render.mockImplementationOnce(async (_pdf, dir) => { await fs.mkdir(dir); });
    await expect(service.manifest('news', '12')).rejects.toMatchObject({ status: 502 });
  });
  it('deduplicates concurrent requests for the same identity and full source URL', async () => {
    const { service, download, render } = setup();
    const [a,b] = await Promise.all([service.manifest('news', '12'), service.manifest('news', '12')]);
    expect(a.version).toBe(b.version); expect(download).toHaveBeenCalledTimes(1); expect(render).toHaveBeenCalledTimes(1);
  });
  it('limits different simultaneous conversions to two without an unbounded queue', async () => {
    const { service, download } = setup();
    let release!: (value: Buffer) => void;
    let ready!: () => void;
    const barrier = new Promise<void>(resolve => { ready = resolve; });
    const bytes = new Promise<Buffer>(resolve => { release = resolve; });
    let entered = 0;
    download.mockImplementation(async () => { entered++; if (entered === 2) ready(); return bytes; });
    const first = service.manifest('news', '12', 'one');
    const second = service.manifest('emagazines', '12', 'two');
    await barrier;
    await expect(service.manifest('news', '12', 'three')).rejects.toMatchObject({ status: 429 });
    release(Buffer.from('%PDF-unit')); await Promise.all([first, second]);
  });
  it('rejects traversal and invalid page numbers before file access', async () => {
    const { service } = setup();
    await expect(service.page('news', '12', '../cache', 1)).rejects.toMatchObject({ status: 400 });
    await expect(service.page('news', '12', 'a'.repeat(64), -1)).rejects.toMatchObject({ status: 400 });
  });
});
describe('bounded trusted PDF download', () => {
  it('accepts only a configured official origin and passes the full signed query unchanged', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('%PDF-unit'));
    await expect(downloadPublishedPdf('https://pdf.test/report.pdf?sig=test', ['https://pdf.test'], fetcher)).resolves.toEqual(Buffer.from('%PDF-unit'));
    expect(String(fetcher.mock.calls[0][0])).toBe('https://pdf.test/report.pdf?sig=test');
    expect(fetcher.mock.calls[0][1].redirect).toBe('manual');
  });
  it.each(['http://169.254.169.254/latest', 'https://evil.test/x.pdf', 'file:///private.pdf', 'https://user:secret@pdf.test/x.pdf'])(
    'rejects an unconfigured/credential/non-http source', async url => {
      const fetcher = vi.fn(); await expect(downloadPublishedPdf(url, ['https://pdf.test'], fetcher)).rejects.toMatchObject({ status: 502 });
      expect(fetcher).not.toHaveBeenCalled();
    });
  it('rejects redirects instead of following to an unapproved host', async () => {
    await expect(downloadPublishedPdf('https://pdf.test/report.pdf', ['https://pdf.test'], vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'http://169.254.169.254' } }))))
      .rejects.toMatchObject({ status: 502 });
  });
  it('rejects oversized responses before buffering', async () => {
    await expect(downloadPublishedPdf('https://pdf.test/report.pdf', ['https://pdf.test'], vi.fn().mockResolvedValue(new Response('%PDF-unit', { headers: { 'content-length': String(31*1024*1024) } }))))
      .rejects.toMatchObject({ status: 413 });
  });
  it('rejects non-PDF bodies', async () => {
    await expect(downloadPublishedPdf('https://pdf.test/report.pdf', ['https://pdf.test'], vi.fn().mockResolvedValue(new Response('<html>login</html>'))))
      .rejects.toMatchObject({ status: 502 });
  });
});
