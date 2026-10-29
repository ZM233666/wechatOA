import { z } from 'zod';

export const imageResourceSchema = z.object({
  url: z.string().startsWith('/mock-assets/'),
  alt: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  aspectRatio: z.number().positive(),
});

/** Django / CDN 等外链图片（live API 校验用，fixture 仍用 imageResourceSchema） */
export const remoteImageResourceSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  aspectRatio: z.number().positive(),
});

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
});

export const featureFlagsSchema = z.object({
  showHomeBanner: z.boolean(),
  showQuickEntries: z.boolean(),
  showLatestNews: z.boolean(),
  showRecommendedProducts: z.boolean(),
  showRecommendedCases: z.boolean(),
  showServiceEntries: z.boolean(),
  showKbLifeSummary: z.boolean(),
  showBrandInfo: z.boolean(),
});
