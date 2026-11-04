import { describe, expect, it } from 'vitest';
import type { EmployeeCareInitiative } from '@app/shared';
import { selectKbLifeCareBanners } from '../src/services/kb-life-banner.service';

function initiative(
  partial: Pick<EmployeeCareInitiative, 'id' | 'title'> &
    Partial<EmployeeCareInitiative>,
): EmployeeCareInitiative {
  return {
    category: 'Local Care',
    date: '2026-01-01',
    description: 'desc',
    image: {
      url: '/mock-assets/kb-life/care.png',
      alt: partial.title,
      width: 400,
      height: 300,
      aspectRatio: 1.33,
    },
    ...partial,
  };
}

describe('selectKbLifeCareBanners', () => {
  it('includes only initiatives flagged showOnKbLifeBanner', () => {
    const banners = selectKbLifeCareBanners([
      initiative({ id: 'a', title: 'A', showOnKbLifeBanner: true }),
      initiative({ id: 'b', title: 'B' }),
    ]);
    expect(banners).toHaveLength(1);
    expect(banners[0]?.id).toBe('a');
    expect(banners[0]?.careId).toBe('a');
    expect(banners[0]?.targetUrl).toContain('care/detail?id=a');
  });

  it('sorts by date descending', () => {
    const banners = selectKbLifeCareBanners([
      initiative({ id: 'old', title: 'Old', date: '2026-01-01', showOnKbLifeBanner: true }),
      initiative({ id: 'new', title: 'New', date: '2026-06-01', showOnKbLifeBanner: true }),
    ]);
    expect(banners.map((b) => b.id)).toEqual(['new', 'old']);
  });
});
