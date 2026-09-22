import type { BrandOverview } from '../schemas/brand.schema';
import { absoluteMediaUrl } from './article-html-media';
import type { BrandIntroRow } from './brand-intro.client';

export function mapBrandIntroRowToOverview(
  row: BrandIntroRow,
  mediaBaseUrl: string,
): BrandOverview {
  const companyName = row.company_name?.trim() || 'Knorr-Bremse Group';
  const coverUrl = absoluteMediaUrl(row.cover_url?.trim() ?? '', mediaBaseUrl);
  const values = (row.our_value_items ?? [])
    .filter((item) => item.title?.trim() || item.content?.trim())
    .map((item) => ({
      title: item.title?.trim() || '',
      description: item.content?.trim() || '',
    }));
  const brands = (row.core_brands ?? [])
    .filter((item) => item.name?.trim())
    .map((item) => item.name!.trim());

  return {
    companyName,
    hero: {
      url: coverUrl || '/mock-assets/brand/brand-hero.png',
      alt: companyName,
      width: 1200,
      height: 675,
      aspectRatio: 1.7778,
    },
    intro: row.company_profile?.trim() || ' ',
    vision: row.our_vision?.trim() || ' ',
    values: values.length ? values : [{ title: '-', description: '-' }],
    brands: brands.length ? brands : ['Knorr-Bremse'],
  };
}
