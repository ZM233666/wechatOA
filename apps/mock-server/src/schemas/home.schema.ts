import { z } from 'zod';
import { newsSummarySchema } from './news.schema';
import { featureFlagsSchema, imageResourceSchema } from './common.schema';

export const appConfigSchema = z.object({
  appName: z.string().min(1),
  brandName: z.string().min(1),
  locale: z.string().min(1),
  supportEmail: z.string().email(),
  featureFlags: featureFlagsSchema,
});

export const homeDataSchema = z.object({
  banners: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      image: imageResourceSchema,
      targetUrl: z.string().optional(),
      newsId: z.string().min(1).optional(),
    }),
  ),
  quickEntries: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      icon: imageResourceSchema,
      target: z.string().min(1),
      path: z.string().min(1),
    }),
  ),
  recommendedProducts: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      nameCn: z.string().min(1),
      summary: z.string().min(1),
      coverImage: imageResourceSchema,
    }),
  ),
  recommendedCases: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      summary: z.string().min(1),
      coverImage: imageResourceSchema,
    }),
  ),
  latestNews: z.array(newsSummarySchema),
  serviceEntries: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      coverImage: imageResourceSchema,
    }),
  ),
  kbLifeSummary: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    entryCount: z.number().int().nonnegative(),
  }),
  brandInfo: z.object({
    name: z.string().min(1),
    summary: z.string().min(1),
    logo: imageResourceSchema,
  }),
  featureFlags: featureFlagsSchema,
});

export const brandOverviewSchema = z.object({
  hero: imageResourceSchema,
  intro: z.string().min(1),
  vision: z.string().min(1),
  values: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
  brands: z.array(z.string().min(1)),
});

export { newsSummarySchema } from './news.schema';

export const homeFileSchema = homeDataSchema.omit({ latestNews: true });
