import type { ImageResource } from '../types/content';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export interface BrandValue {
  title: string;
  description: string;
}

export interface BrandViewData {
  hero: string;
  intro: string;
  vision: string;
  values: BrandValue[];
  brands: string[];
}

interface BrandDto {
  hero: ImageResource;
  intro: string;
  vision: string;
  values: BrandValue[];
  brands: string[];
}

export async function getBrand(): Promise<BrandViewData> {
  const data = await get<BrandDto>(API_ENDPOINTS.brand);
  return {
    hero: toAssetUrl(data.hero),
    intro: data.intro,
    vision: data.vision,
    values: data.values,
    brands: data.brands,
  };
}
