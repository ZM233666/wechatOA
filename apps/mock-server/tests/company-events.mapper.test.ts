import { describe, expect, it } from 'vitest';
import {
  mapAnnualDinner,
  mapHealthCheckup,
  mapOutingActivities,
} from '../src/services/company-events.mapper';

describe('company-events.mapper', () => {
  it('maps published annual dinner and strips highlight prefixes', () => {
    const result = mapAnnualDinner({
      title: '2026 年会',
      event_time: '2026-01-15 17:30:00',
      venue: '洲际大酒店',
      dress_code: '商务休闲',
      highlights: ['1 表彰大会', '2 抽奖'],
      status: 'published',
    });
    expect(result?.title).toBe('2026 年会');
    expect(result?.highlights).toEqual(['表彰大会', '抽奖']);
    expect(result?.venue).toBe('洲际大酒店');
  });

  it('skips draft annual dinner', () => {
    expect(mapAnnualDinner({ title: 'Draft', status: 'draft' })).toBeNull();
  });

  it('splits bilingual outing description and signup status', () => {
    const rows = mapOutingActivities([
      {
        id: 2,
        title: '秋季徒步',
        description: '国家森林公园徒步\nOne-day hiking challenge.',
        event_date: '2026-10-20',
        signup_status: 'open',
        status: 'published',
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].descriptionCn).toContain('国家森林公园');
    expect(rows[0].descriptionEn).toContain('One-day hiking');
    expect(rows[0].status).toBe('open');
  });

  it('maps health checkup pdf and images when published', () => {
    const result = mapHealthCheckup({
      title: '年度体检',
      subtitle: '请预约',
      pdf_url: 'https://example.com/book.pdf',
      pdf_file_name: 'book.pdf',
      images: [{ url: 'https://example.com/a.jpg', file_name: 'a.jpg', sort: 0 }],
      status: 'published',
    });
    expect(result?.pdfUrl).toBe('https://example.com/book.pdf');
    expect(result?.images).toHaveLength(1);
  });
});
