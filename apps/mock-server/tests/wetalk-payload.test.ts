import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { enrichWetalkMiniPayload, isWeakWetalkCover } from '../src/services/wetalk-payload.service';

const req = {
  protocol: 'http',
  get: (name: string) => (name === 'host' ? '127.0.0.1:3100' : undefined),
} as Request;

describe('wetalk payload cover enrichment', () => {
  it('absolutizes CMS media covers', () => {
    const payload = enrichWetalkMiniPayload(
      req,
      {
        items: [
          {
            id: 3,
            pdfUrl: '',
            pdfFileName: '',
            coverUrl: '/media/wetalk/cover.png',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      },
      'news',
    );
    expect(payload.items[0].coverUrl).toMatch(/^https?:\/\//);
    expect(payload.items[0].coverUrl).toContain('/media/wetalk/cover.png');
  });

  it('routes PDF rows with weak covers to the protected cover endpoint', () => {
    const payload = enrichWetalkMiniPayload(
      req,
      {
        items: [
          {
            id: 12,
            pdfUrl: 'https://pdf.test/a.pdf',
            pdfFileName: 'a.pdf',
            coverUrl: '',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      },
      'emagazines',
    );
    expect(isWeakWetalkCover('')).toBe(true);
    expect(payload.items[0].coverUrl).toBe('http://127.0.0.1:3100/api/wetalk/emagazines/12/cover');
  });
});