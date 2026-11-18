import { getApiBaseUrl, getApiEnvironment, getCurrentEnvVersion, isForbiddenProductionApiBaseUrl } from '../config/env';
import type { InsightReportView } from './services.service';
import { API_ENDPOINTS } from './endpoints';
import { getLoginCodeQueryParams } from './identity-binding.service';
import { get, invalidateRequestCache, withRequestCache } from './request';
import { RequestError } from '../types/api';
import { openRemotePdf } from '../utils/open-remote-pdf';

export type WetalkType = 'news' | 'emagazine';
export type WetalkContentKind = 'article' | 'pdf';
export interface WetalkItem {
  id: number; type: WetalkType; title: string; volumeNo: string;
  summary: string; author: string; coverUrl: string; pdfUrl: string;
  pdfFileName: string; publishTime: string; views: number;
}
export interface WetalkCover {
  id: string; type: WetalkType; title: string; volumeNo: string;
  date: string; image: string; kind: WetalkContentKind; kindLabel: string;
}
interface WetalkList { items: WetalkItem[]; total: number; page: number; limit: number }

function joinApiPath(path: string): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

function isWeakWetalkCover(url: string): boolean {
  const value = (url || '').trim().toLowerCase();
  if (!value) {
    return true;
  }
  return (
    value.includes('care.png') ||
    value.includes('placeholder') ||
    value.includes('news-001-cover') ||
    value.includes('wetalk-coverpage.png')
  );
}

function withCoverIdentity(url: string, headers: Record<string, string>): string {
  if (!url) {
    return '';
  }
  const needsAuth = /\/wetalk\/(?:news|emagazines)\/\d+\/cover(?:\?|$|#)/.test(url);
  if (!needsAuth) {
    return url;
  }
  const code = headers['X-Login-Code'];
  if (!code || url.includes('loginCode=')) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}loginCode=${encodeURIComponent(code)}`;
}

function resolveWetalkCoverImage(item: WetalkItem, headers: Record<string, string>): string {
  let url = (item.coverUrl || '').trim();
  if (url && !/^https?:\/\//i.test(url)) {
    url = joinApiPath(url);
  }
  if (url && !isWeakWetalkCover(url)) {
    return withCoverIdentity(url, headers);
  }
  if (!item.pdfUrl.trim()) {
    return url;
  }
  const resource = item.type === 'news' ? 'news' : 'emagazines';
  return withCoverIdentity(joinApiPath(API_ENDPOINTS.kbLifeWetalkCover(resource, String(item.id))), headers);
}

function assertItem(value: WetalkItem, type: WetalkType): void {
  if (!value || !Number.isInteger(value.id) || value.id <= 0 || value.type !== type ||
    !['title', 'volumeNo', 'summary', 'author', 'coverUrl', 'pdfUrl', 'pdfFileName', 'publishTime']
      .every(key => typeof (value as unknown as Record<string, unknown>)[key] === 'string')) {
    throw new RequestError('WeTalk 响应格式错误');
  }
}

function toWetalkCover(item: WetalkItem, headers: Record<string, string>): WetalkCover {
  return {
    id: String(item.id),
    type: item.type,
    title: item.title,
    volumeNo: item.volumeNo,
    date: item.publishTime,
    image: resolveWetalkCoverImage(item, headers),
    kind: item.pdfUrl ? 'pdf' : 'article',
    kindLabel: item.pdfUrl ? 'PDF' : 'News',
  };
}

// Same KB Life session code, sent as a header so request debug logs do not print it.
async function identityHeaders(): Promise<Record<string, string>> {
  const identity = await getLoginCodeQueryParams();
  return identity.loginCode ? { 'X-Login-Code': identity.loginCode } : {};
}

/** No persistent list/detail cache: these responses contain expiring asset URLs. */
async function listCovers(type: WetalkType): Promise<WetalkCover[]> {
  const endpoint = type === 'news' ? API_ENDPOINTS.kbLifeWetalk : API_ENDPOINTS.kbLifeWetalkMagazines;
  const headers = await identityHeaders();
  const covers: WetalkCover[] = [];
  let page = 1;
  let received = 0;
  while (true) {
    const data = await get<WetalkList>(endpoint, { page, limit: 50 }, headers);
    if (!data || !Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0 ||
      data.page !== page || !Number.isInteger(data.limit) || data.limit < 1 || data.limit > 100) {
      throw new RequestError('WeTalk 列表响应格式错误');
    }
    data.items.forEach(item => {
      assertItem(item, type);
      covers.push(toWetalkCover(item, headers));
    });
    received += data.items.length;
    if (received >= data.total) return covers;
    if (data.items.length === 0) throw new RequestError('WeTalk 分页数据不完整');
    page += 1;
  }
}
export function getWetalkIssues(): Promise<WetalkCover[]> { return listCovers('news'); }
export function getWetalkMagazines(): Promise<WetalkCover[]> { return listCovers('emagazine'); }
export async function getWetalkFeatured(): Promise<WetalkCover | null> {
  const headers = await identityHeaders();
  const data = await get<WetalkList>(API_ENDPOINTS.kbLifeWetalk, { page: 1, limit: 1 }, headers);
  if (!data || !Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0 ||
    data.page !== 1 || data.limit !== 1 || data.items.length > 1) {
    throw new RequestError('WeTalk 推荐响应格式错误');
  }
  const item = data.items[0];
  if (!item) {
    return null;
  }
  assertItem(item, 'news');
  return toWetalkCover(item, headers);
}

export async function getWetalkDetail(type: WetalkType, id: string): Promise<WetalkItem> {
  if (!/^[1-9]\d*$/.test(id)) throw new RequestError('无效的 WeTalk ID', 404);
  const endpoint = type === 'news' ? API_ENDPOINTS.kbLifeWetalkDetail(id)
    : API_ENDPOINTS.kbLifeWetalkMagazineDetail(id);
  const headers = await identityHeaders();
  const item = await get<WetalkItem>(endpoint, undefined, headers);
  assertItem(item, type);
  if (String(item.id) !== id) throw new RequestError('WeTalk 详情 ID 不匹配');
  return { ...item, coverUrl: resolveWetalkCoverImage(item, headers) };
}
/** Every click refreshes the signed PDF URL from the matching detail endpoint. */
export async function openWetalkPdf(type: WetalkType, id: string): Promise<void> {
  const item = await getWetalkDetail(type, id);
  if (!item.pdfUrl.trim()) throw new RequestError('暂无 PDF 文件');
  await openRemotePdf(item.pdfUrl);
}


interface WetalkBookManifest {
  id: number; type: WetalkType; title: string; volumeNo: string; publishTime: string; coverUrl: string;
  version: string; pageCount: number; pages: Array<{ number: number; width: number; height: number }>;
}
/** 短缓存只覆盖快速关闭/重开；页图返回 410 时会立即失效并重新授权。 */
export async function getWetalkBook(type: WetalkType, id: string): Promise<InsightReportView> {
  if (!/^[1-9]\d*$/.test(id)) throw new RequestError('无效的 WeTalk ID', 404);
  const resource = type === 'news' ? 'news' : 'emagazines';
  const headers = await identityHeaders();
  const identityScope = headers['X-Login-Code'] || 'anonymous';
  return withRequestCache(`wetalk-book:${type}:${id}:${identityScope}`, 30_000, async () => {
    const data = await get<WetalkBookManifest>(
      API_ENDPOINTS.kbLifeWetalkReader(resource, id),
      undefined,
      headers,
      90_000,
    );
    if (!data || String(data.id) !== id || data.type !== type || !/^[a-f0-9]{64}$/.test(data.version) ||
      !Array.isArray(data.pages) || !data.pages.length || data.pages.length > 120 || data.pages.length !== data.pageCount ||
      data.pages.some((page, index) => page.number !== index + 1 || !Number.isInteger(page.width) ||
        !Number.isInteger(page.height) || page.width <= 0 || page.height <= 0 || page.width * page.height > 12_000_000)) {
      throw new RequestError('WeTalk 阅读清单格式错误');
    }
    return { id: `${type}:${id}`, title: data.title, titleEn: data.title, caption: data.volumeNo || data.publishTime,
      kicker: 'WeTalk', english: data.publishTime, image: data.coverUrl, gating: false,
      pages: data.pages.map(page => ({ id: `${type}:${id}:${data.version}:${page.number}`, type: 'sheet',
        title: `第 ${page.number} 页`, thumbTone: 'sheet', protectedImage: true,
        coverImage: API_ENDPOINTS.kbLifeWetalkReaderPage(resource, id, data.version, page.number) })) };
  });
}

// Short, bounded temporary-file reuse keeps the preloaded under-page ready during a flip.
// Keyed by BFF origin, content-version path AND current identity; no persistent storage.
const readerImages = new Map<string, { file: string; expires: number }>();
const readerImageRequests = new Map<string, Promise<string>>();

/** image tags cannot send headers: download only authenticated, same-BFF reader pages to a temporary file. */
export async function downloadWetalkReaderImage(imagePath: string): Promise<string> {
  if (!/^\/[^?#]*wetalk\/(news|emagazines)\/[1-9]\d*\/reader\/pages\/[a-f0-9]{64}\/[1-9]\d*$/.test(imagePath) || imagePath.includes('..')) {
    throw new RequestError('阅读页地址无效');
  }
  const env = getApiEnvironment();
  if (isForbiddenProductionApiBaseUrl(getCurrentEnvVersion(), env.apiBaseUrl)) throw new RequestError('尚未配置正式阅读服务地址');
  const headers = await identityHeaders();
  const key = JSON.stringify([env.apiBaseUrl, imagePath, headers['X-Login-Code'] || '']);
  readerImages.forEach((value, entry) => {
    if (value.expires <= Date.now()) readerImages.delete(entry);
  });
  const cached = readerImages.get(key);
  if (cached) return cached.file;
  const pending = readerImageRequests.get(key);
  if (pending) return pending;
  const download = new Promise<string>((resolve, reject) => {
    wx.downloadFile({ url: env.apiBaseUrl.replace(/\/+$/, '') + imagePath, header: headers, timeout: 20_000,
      success(result) {
        if (result.statusCode === 200 && result.tempFilePath) resolve(result.tempFilePath);
        else {
          if (result.statusCode === 410) invalidateRequestCache('wetalk-book:');
          reject(new RequestError(result.statusCode === 410 ? '阅读已过期，请关闭后重新打开' : '页图暂不可用，点击重试', result.statusCode));
        }
      },
      fail() { reject(new RequestError('页图暂不可用，点击重试')); },
    });
  });
  readerImageRequests.set(key, download);
  try {
    const file = await download;
    if (readerImages.size >= 6) {
      const oldest = readerImages.keys().next().value;
      if (oldest !== undefined) readerImages.delete(oldest);
    }
    readerImages.set(key, { file, expires: Date.now() + 30_000 });
    return file;
  } finally { if (readerImageRequests.get(key) === download) readerImageRequests.delete(key); }
}
