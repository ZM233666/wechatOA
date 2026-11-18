import { describe, expect, it, vi } from 'vitest';
import { buildWetalkMiniUrl, readWetalkMini } from '../src/services/wetalk-mini.client';

const item = { id: 12, type: 'news', title: 'test', volumeNo: '2024-01', summary: '', author: '',
  coverUrl: 'https://assets.test/cover.png', pdfUrl: 'https://assets.test/report.pdf',
  pdfFileName: 'report.pdf', publishTime: '2026-03-16T10:00:00+08:00', views: 0 };
const list = { items: [item], total: 1, page: 1, limit: 50 };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const options = { baseUrl: 'http://cms.test', resource: 'news' as const };

describe('documented WeTalk Mini client', () => {
  it.each(['', '/api', '/api/v1/mini', '/api/v1/mini/wetalk/', '/api/wetalk/'])(
    'normalizes a supported API base without duplicate /api: %s', prefix => {
      const url = buildWetalkMiniUrl(`http://cms.test${prefix}`, 'news');
      expect(url.pathname).toBe(prefix === '/api/wetalk/' ? '/api/wetalk/news/' : '/api/v1/mini/wetalk/news/');
      expect(url.pathname).not.toContain('/api/api');
    });
  it('rejects an unrelated/management base instead of changing API target', () => {
    expect(() => buildWetalkMiniUrl('http://cms.test/api/article-content/content/', 'news')).toThrow();
  });
  it('forwards pagination and the caller login code only, with no management/JWT requests', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ success: true, data: list }));
    await expect(readWetalkMini({ ...options, page: 2, limit: 10, loginCode: 'test-only-session' }, fetcher))
      .resolves.toEqual(list);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe('http://cms.test/api/v1/mini/wetalk/news/?page=2&limit=10');
    expect(init.headers).toEqual({ Accept: 'application/json', 'X-Login-Code': 'test-only-session' });
    expect(init.headers).not.toHaveProperty('Authorization');
  });
  it('allows anonymous requests and preserves legitimate empty results', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ success: true, data: { ...list, items: [], total: 0 } }));
    await expect(readWetalkMini(options, fetcher)).resolves.toMatchObject({ items: [], total: 0 });
    expect(fetcher.mock.calls[0][1].headers).toEqual({ Accept: 'application/json' });
  });
  it('uses distinct emagazine detail resource and numeric ID', async () => {
    const data = { ...item, type: 'emagazine' };
    const fetcher = vi.fn().mockResolvedValue(response({ success: true, data }));
    await expect(readWetalkMini({ ...options, resource: 'emagazines', id: '12' }, fetcher)).resolves.toEqual(data);
    expect(String(fetcher.mock.calls[0][0])).toBe('http://cms.test/api/v1/mini/wetalk/emagazines/12/');
  });
  it.each([401, 403, 404])('preserves upstream HTTP %i without exposing its body', async status => {
    const fetcher = vi.fn().mockResolvedValue(response({ success: false, message: 'private-upstream-message' }, status));
    await expect(readWetalkMini({ ...options, id: '12' }, fetcher)).rejects.toMatchObject({ status });
    await expect(readWetalkMini({ ...options, id: '12' }, vi.fn().mockResolvedValue(response({}, status))))
      .rejects.not.toHaveProperty('message', 'private-upstream-message');
  });
  it.each([{ success: false, message: 'private' }, { code: 2000, data: [] },
    { success: true, data: [] }, { success: true, data: { ...list, items: [{ ...item, type: 'emagazine' }] } }])(
    'rejects business/legacy/shape/type errors rather than fixtures', async body => {
      await expect(readWetalkMini(options, vi.fn().mockResolvedValue(response(body))))
        .rejects.toMatchObject({ status: 502 });
    });
  it('preserves an HTML 404 instead of misclassifying it as JSON/network failure', async () => {
    await expect(readWetalkMini({ ...options, id: '12' }, vi.fn().mockResolvedValue(new Response('<html>not found</html>', { status: 404 }))))
      .rejects.toMatchObject({ status: 404 });
  });
  it('rejects invalid JSON as a contract error', async () => {
    await expect(readWetalkMini(options, vi.fn().mockResolvedValue(new Response('not-json'))))
      .rejects.toMatchObject({ status: 502, message: 'WeTalk 响应契约错误' });
  });
  it('sanitizes network failures', async () => {
    await expect(readWetalkMini(options, vi.fn().mockRejectedValue(new Error('private-url'))))
      .rejects.toMatchObject({ status: 502, message: 'WeTalk 服务暂不可用' });
  });
  it('never caches signed detail URLs across reads', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ success: true, data: { ...item, pdfUrl: 'https://assets.test/first.pdf' } }))
      .mockResolvedValueOnce(response({ success: true, data: { ...item, pdfUrl: 'https://assets.test/fresh.pdf' } }));
    await readWetalkMini({ ...options, id: '12' }, fetcher);
    await expect(readWetalkMini({ ...options, id: '12' }, fetcher)).resolves.toHaveProperty('pdfUrl', 'https://assets.test/fresh.pdf');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
