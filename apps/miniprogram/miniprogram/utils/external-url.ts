import { getApiBaseUrl } from '../config/env';

/** 将配置中的外链补全为可请求的绝对地址（支持以 / 开头的 API 相对路径） */
export function resolveAbsoluteExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

function probeOnce(method: 'HEAD' | 'GET', url: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    wx.request({
      url,
      method,
      timeout: timeoutMs,
      success: (res) => {
        const code = res.statusCode ?? 0;
        resolve(code >= 200 && code < 400);
      },
      fail: () => resolve(false),
    });
  });
}

/** 探测外链是否可达；失败时返回 false，不抛错 */
export async function probeUrlReachable(url: string, timeoutMs = 5000): Promise<boolean> {
  const target = resolveAbsoluteExternalUrl(url);
  if (!target) {
    return false;
  }
  if (await probeOnce('HEAD', target, timeoutMs)) {
    return true;
  }
  return probeOnce('GET', target, timeoutMs);
}

export type WithProbedExternalUrl = {
  externalUrl?: string;
  showOnline?: boolean;
};

/** 按条目独立探测 externalUrl，可达则 showOnline=true */
export async function enrichOnlineStatusFromExternalUrl<T extends WithProbedExternalUrl>(
  items: T[],
): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.externalUrl?.trim()) {
        return { ...item, showOnline: false };
      }
      const ok = await probeUrlReachable(item.externalUrl);
      return { ...item, showOnline: ok };
    }),
  );
}