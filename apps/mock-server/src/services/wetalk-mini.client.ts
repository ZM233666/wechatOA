import { z } from 'zod';

export type WetalkResource = 'news' | 'emagazines';
export class WetalkMiniError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
const itemSchema = z.object({
  id: z.number().int().positive(), type: z.enum(['news', 'emagazine']),
  title: z.string(), volumeNo: z.string(), summary: z.string(), author: z.string(),
  coverUrl: z.string(), pdfUrl: z.string(), pdfFileName: z.string(),
  publishTime: z.string(), views: z.number(),
});
const listSchema = z.object({
  items: z.array(itemSchema), total: z.number().int().nonnegative(),
  page: z.number().int().positive(), limit: z.number().int().min(1).max(100),
});

/** Use only the documented public Mini API, never management APIs/JWT login. */
export function buildWetalkMiniUrl(base: string, resource: WetalkResource, id?: string): URL {
  let url: URL;
  try { url = new URL(base); } catch { throw new WetalkMiniError(502, 'WeTalk API 地址配置无效'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new WetalkMiniError(502, 'WeTalk API 地址配置无效');
  const prefix = url.pathname.replace(/\/+$/, '');
  if (url.username || url.password || url.search || url.hash) {
    throw new WetalkMiniError(502, 'WeTalk API 地址配置无效');
  }
  if (/^\/api(?:\/v1\/mini)?\/wetalk$/.test(prefix)) url.pathname = prefix;
  else if (prefix === '' || prefix === '/api' || prefix === '/api/v1/mini') {
    url.pathname = '/api/v1/mini/wetalk';
  } else throw new WetalkMiniError(502, 'WeTalk API 前缀配置无效');
  if (id !== undefined && !/^[1-9]\d*$/.test(id)) throw new WetalkMiniError(400, '无效的 WeTalk ID');
  url.pathname += `/${resource}/${id === undefined ? '' : `${id}/`}`;
  return url;
}

export async function readWetalkMini(options: {
  baseUrl: string; resource: WetalkResource; id?: string;
  page?: number; limit?: number; loginCode?: string;
}, fetcher: typeof fetch = fetch) {
  const url = buildWetalkMiniUrl(options.baseUrl, options.resource, options.id);
  if (options.id === undefined) {
    url.searchParams.set('page', String(options.page ?? 1));
    url.searchParams.set('limit', String(options.limit ?? 50));
  }
  // Forward only the caller's existing KB Life identity. Do not obtain elevated credentials.
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.loginCode) headers['X-Login-Code'] = options.loginCode;
  let response: Response;
  let body: unknown;
  try {
    response = await fetcher(url, { headers, signal: AbortSignal.timeout(15_000) });
  } catch { throw new WetalkMiniError(502, 'WeTalk 服务暂不可用'); }
  if (!response.ok) {
    const status = [400, 401, 403, 404].includes(response.status) ? response.status : 502;
    throw new WetalkMiniError(status, status === 404 ? '内容不存在或未发布' : 'WeTalk 请求失败，请检查身份或稍后重试');
  }
  try { body = await response.json(); }
  catch { throw new WetalkMiniError(502, 'WeTalk 响应契约错误'); }
  if (!body || typeof body !== 'object' || !('success' in body)) {
    throw new WetalkMiniError(502, 'WeTalk 响应契约错误');
  }
  const envelope = body as { success: unknown; data?: unknown };
  // Do not echo upstream bodies/messages, which may contain signed URLs or private details.
  if (envelope.success !== true) throw new WetalkMiniError(502, 'WeTalk 服务返回失败');
  const parsed = (options.id === undefined ? listSchema : itemSchema).safeParse(envelope.data);
  if (!parsed.success) throw new WetalkMiniError(502, 'WeTalk 响应契约错误');
  const expectedType = options.resource === 'news' ? 'news' : 'emagazine';
  const items = 'items' in parsed.data ? parsed.data.items : [parsed.data];
  if (items.some(item => item.type !== expectedType)) throw new WetalkMiniError(502, 'WeTalk 内容类型不匹配');
  return parsed.data;
}
