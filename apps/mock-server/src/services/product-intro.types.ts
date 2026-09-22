export const PRODUCT_INTRO_SYSTEMS = ['braking', 'door', 'power-supply'] as const;

export type ProductIntroSystem = (typeof PRODUCT_INTRO_SYSTEMS)[number];

export type ProductIntroDetailItem = {
  id?: string;
  title?: string;
  content?: string;
  [key: string]: unknown;
};

export const PRODUCT_INTRO_SYSTEM_META: Array<{
  slug: ProductIntroSystem;
  name: string;
  nameEn: string;
}> = [
  { slug: 'braking', name: '制动系统', nameEn: 'Braking Systems' },
  { slug: 'door', name: '门系统', nameEn: 'Door Systems (IFE)' },
  { slug: 'power-supply', name: '电源系统', nameEn: 'Power Supply Systems (Microelettrica)' },
];

export type ProductIntroPublicSummary = {
  id: string;
  productName: string;
  productNo: string;
  summary: string;
  category: string;
  coverUrl: string;
  isCoreProduct: boolean;
  publishTime: string | null;
  updateDatetime: string;
};

export type ProductIntroPublicDetail = ProductIntroPublicSummary & {
  detailItems: ProductIntroDetailItem[];
};

export function isProductIntroSystem(value: string): value is ProductIntroSystem {
  return (PRODUCT_INTRO_SYSTEMS as readonly string[]).includes(value);
}
