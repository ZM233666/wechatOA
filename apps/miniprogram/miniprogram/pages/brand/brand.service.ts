import type { ImageResource } from '../types/content';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export interface BrandValue {
  title: string;
  description: string;
}

export interface BrandViewData {
  companyName: string;
  hero: string;
  intro: string;
  vision: string;
  values: BrandValue[];
  brands: string[];
}

interface BrandDto {
  companyName?: string;
  hero: ImageResource;
  intro: string;
  vision: string;
  values: BrandValue[];
  brands: string[];
}

function filterValues(values: BrandValue[]): BrandValue[] {
  return values.filter((item) => item.title?.trim() || item.description?.trim());
}

function filterBrands(brands: string[]): string[] {
  return brands.filter((item) => item?.trim());
}

export async function getBrand(): Promise<BrandViewData> {
  const data = await get<BrandDto>(API_ENDPOINTS.brand);
  return {
    companyName: data.companyName?.trim() || 'Knorr-Bremse Group',
    hero: toAssetUrl(data.hero),
    intro: data.intro?.trim() || '',
    vision: data.vision?.trim() || '',
    values: filterValues(data.values ?? []),
    brands: filterBrands(data.brands ?? []),
  };
}
