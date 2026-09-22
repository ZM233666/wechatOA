import { describe, expect, it } from 'vitest';
import { mapBrandIntroRowToOverview } from '../src/services/brand-intro.mapper';

describe('brand-intro.mapper', () => {
  it('maps structured fields and filters empty items', () => {
    const overview = mapBrandIntroRowToOverview(
      {
        id: 1,
        company_name: 'KB China',
        company_profile: '公司简介',
        our_vision: 'Our vision text',
        our_value_items: [
          { id: 'v1', title: 'Reliability', content: 'We deliver.' },
          { id: 'v2', title: '', content: '' },
        ],
        core_brands: [
          { id: 'b1', name: 'Bendix', description: 'Braking' },
          { id: 'b2', name: '  ', description: 'skip' },
        ],
        cover_url: '/media/brand/cover.jpg',
      },
      'http://127.0.0.1:8000',
    );

    expect(overview.companyName).toBe('KB China');
    expect(overview.hero.url).toBe('http://127.0.0.1:8000/media/brand/cover.jpg');
    expect(overview.intro).toBe('公司简介');
    expect(overview.values).toHaveLength(1);
    expect(overview.brands).toEqual(['Bendix']);
  });

  it('keeps absolute cover url unchanged', () => {
    const overview = mapBrandIntroRowToOverview(
      {
        id: 2,
        company_name: 'Test',
        cover_url: 'https://minio.example.com/wechat/cover.png',
      },
      'http://127.0.0.1:8000',
    );
    expect(overview.hero.url).toBe('https://minio.example.com/wechat/cover.png');
  });
});
