import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { mockEnv } from '../config/env';
import { renderLivePdfSheets } from './pdf-sheet.service';
import { readWetalkMini, WetalkMiniError, type WetalkResource } from './wetalk-mini.client';

const MAX_BYTES = 30 * 1024 * 1024;
const LEASE_MS = 10 * 60_000;
export const WETALK_BOOK_DIR = path.resolve(__dirname, '../../runtime/wetalk-reader');
export class WetalkBookError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export interface PublishedPdf {
  id: number; type: 'news' | 'emagazine'; title: string; volumeNo: string;
  publishTime: string; coverUrl: string; pdfUrl: string;
}
interface Sheet { number: number; width: number; height: number; file: string }
interface CachedBook { version: string; pages: Sheet[] }
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

/** Only an official detail can supply this URL. Exact configured origins; no redirects. */
export async function downloadPublishedPdf(urlText: string, allowedOrigins: string[], fetcher: typeof fetch = fetch): Promise<Buffer> {
  let url: URL;
  try { url = new URL(urlText); } catch { throw new WetalkBookError(502, 'PDF 地址无效'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || !allowedOrigins.includes(url.origin)) {
    throw new WetalkBookError(502, 'PDF 来源不在已配置服务范围内');
  }
  try {
    const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new WetalkBookError(502, 'PDF 下载失败，请重新打开重试');
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body.cancel();
      throw new WetalkBookError(413, 'PDF 超过 30MB 阅读限制');
    }
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new WetalkBookError(413, 'PDF 超过 30MB 阅读限制'); }
      chunks.push(Buffer.from(result.value));
    }
    const bytes = Buffer.concat(chunks);
    if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new WetalkBookError(502, '返回内容不是有效 PDF');
    return bytes;
  } catch (error) {
    if (error instanceof WetalkBookError) throw error;
    throw new WetalkBookError(502, 'PDF 下载失败或超时，请重新打开重试');
  }
}

export function createWetalkBookService(deps: {
  root: string;
  detail: (resource: WetalkResource, id: string, code?: string) => Promise<PublishedPdf>;
  download: (url: string) => Promise<Buffer>;
  render: (pdf: string, dir: string) => Promise<void>;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  const leases = new Map<string, { version: string; expires: number }>();
  const pending = new Map<string, Promise<CachedBook>>();
  let active = 0;
  const scope = (resource: WetalkResource, id: string, code?: string) => `${resource}:${id}:${digest(code || 'anonymous')}`;
  async function authorized(resource: WetalkResource, id: string, code?: string) {
    if (!['news', 'emagazines'].includes(resource) || !/^[1-9]\d*$/.test(id)) throw new WetalkBookError(400, '无效的刊物标识');
    const item = await deps.detail(resource, id, code);
    if (String(item.id) !== id || item.type !== (resource === 'news' ? 'news' : 'emagazine')) throw new WetalkBookError(502, '刊物详情不匹配');
    if (!item.pdfUrl.trim()) throw new WetalkBookError(404, '该新闻暂无 PDF 附件');
    return item;
  }
  function bookDir(resource: WetalkResource, id: string, version: string) { return path.join(deps.root, resource, id, version); }
  async function cached(resource: WetalkResource, id: string, version: string): Promise<CachedBook | null> {
    try {
      const dir = bookDir(resource, id, version);
      const book = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')) as CachedBook;
      if (book.version !== version || !Array.isArray(book.pages) || !book.pages.length || book.pages.length > 120) return null;
      for (const [index, sheet] of book.pages.entries()) {
        if (sheet.number !== index + 1 || !/^page-\d+\.png$/.test(sheet.file) || sheet.width <= 0 || sheet.height <= 0) return null;
        if (!(await fs.stat(path.join(dir, sheet.file))).isFile()) return null;
      }
      return book;
    } catch { return null; }
  }
  async function build(resource: WetalkResource, id: string, source: string): Promise<CachedBook> {
    if (active >= 2) throw new WetalkBookError(429, '阅读转换繁忙，请稍后重试');
    active += 1;
    let work = '';
    try {
      // Download on every new reading: rotated signatures are never treated as content versions.
      const bytes = await deps.download(source);
      const version = digest(Buffer.concat([Buffer.from(`wetalk-book-v1:zoom2:${resource}:${id}:`), bytes]));
      const hit = await cached(resource, id, version);
      if (hit) return hit;
      await fs.mkdir(deps.root, { recursive: true });
      work = await fs.mkdtemp(path.join(deps.root, '.render-'));
      const pdf = path.join(work, 'source.pdf');
      const sheets = path.join(work, 'sheets');
      await fs.writeFile(pdf, bytes, { flag: 'wx' });
      await deps.render(pdf, sheets);
      const names = (await fs.readdir(sheets)).filter(name => /^page-\d+\.png$/.test(name))
        .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
      if (!names.length || names.length > 120) throw new WetalkBookError(502, 'PDF 转页未生成有效清单');
      const pages: Sheet[] = [];
      for (const [index, file] of names.entries()) {
        if (Number(file.match(/\d+/)?.[0]) !== index + 1) throw new WetalkBookError(502, 'PDF 页码不连续');
        const handle = await fs.open(path.join(sheets, file), 'r');
        const header = Buffer.alloc(24);
        try { await handle.read(header, 0, 24, 0); } finally { await handle.close(); }
        if (!header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new WetalkBookError(502, 'PDF 页图格式错误');
        const width = header.readUInt32BE(16), height = header.readUInt32BE(20);
        if (!width || !height || width * height > 12_000_000) throw new WetalkBookError(502, 'PDF 页图尺寸超限');
        pages.push({ number: index + 1, file, width, height });
      }
      const book = { version, pages };
      await fs.writeFile(path.join(sheets, 'manifest.json'), JSON.stringify(book), { flag: 'wx' });
      const destination = bookDir(resource, id, version);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      // Only publish a fully rendered immutable directory; never overwrite original PDFs/cache versions.
      try { await fs.rename(sheets, destination); }
      catch (error) { if (!(await cached(resource, id, version))) throw error; }
      return book;
    } catch (error) {
      if (error instanceof WetalkBookError || error instanceof WetalkMiniError) throw error;
      throw new WetalkBookError(502, 'PDF 转页失败或超过限制，请关闭后重新打开重试');
    } finally {
      active -= 1;
      // This removes only this request's fresh scratch directory, never existing cache versions.
      if (work) await fs.rm(work, { recursive: true, force: true });
    }
  }
  return {
    async manifest(resource: WetalkResource, id: string, code?: string) {
      const item = await authorized(resource, id, code); // Always recheck publication and caller access.
      const key = `${scope(resource, id, code)}:${digest(item.pdfUrl)}`;
      let promise = pending.get(key);
      if (!promise) { promise = build(resource, id, item.pdfUrl); pending.set(key, promise); }
      let book: CachedBook;
      try { book = await promise; } finally { if (pending.get(key) === promise) pending.delete(key); }
      for (const [key, value] of leases) if (value.expires <= now()) leases.delete(key);
      const leaseKey = scope(resource, id, code);
      if (!leases.has(leaseKey) && leases.size >= 128) throw new WetalkBookError(429, '阅读会话已满，请稍后重试');
      leases.set(leaseKey, { version: book.version, expires: now() + LEASE_MS });
      return { id: item.id, type: item.type, title: item.title, volumeNo: item.volumeNo,
        publishTime: item.publishTime, coverUrl: item.coverUrl, version: book.version,
        pageCount: book.pages.length, pages: book.pages.map(({ number, width, height }) => ({ number, width, height })) };
    },
    async cover(resource: WetalkResource, id: string, code?: string) {
      const book = await this.manifest(resource, id, code);
      return this.page(resource, id, book.version, 1, code);
    },
    async page(resource: WetalkResource, id: string, version: string, number: number, code?: string) {
      if (!/^[a-f0-9]{64}$/.test(version) || !Number.isInteger(number) || number < 1 || number > 120) throw new WetalkBookError(400, '无效的阅读页码');
      await authorized(resource, id, code); // Cached images never bypass the current official Mini gate.
      const lease = leases.get(scope(resource, id, code));
      if (!lease || lease.expires <= now() || lease.version !== version) throw new WetalkBookError(410, '阅读已过期，请关闭后重新打开');
      const book = await cached(resource, id, version);
      const sheet = book?.pages[number - 1];
      if (!sheet) throw new WetalkBookError(404, '阅读页不存在，请重新打开');
      lease.expires = now() + LEASE_MS;
      return path.join(bookDir(resource, id, version), sheet.file);
    },
  };
}

function allowedOrigins(): string[] {
  return [new URL(mockEnv.NEWS_ARTICLE_API_BASE_URL).origin,
    new URL(`${mockEnv.MINIO_USE_SSL ? 'https' : 'http'}://${mockEnv.MINIO_ENDPOINT}:${mockEnv.MINIO_PORT}`).origin];
}
export const wetalkBooks = createWetalkBookService({ root: WETALK_BOOK_DIR,
  detail: async (resource, id, code) => {
    const item = await readWetalkMini({ baseUrl: mockEnv.NEWS_ARTICLE_API_BASE_URL, resource, id, loginCode: code });
    if ('items' in item) throw new WetalkBookError(502, '刊物详情契约错误');
    return item;
  },
  download: url => downloadPublishedPdf(url, allowedOrigins()), render: renderLivePdfSheets,
});
