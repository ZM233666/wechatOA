import { z } from 'zod';
import { articleContentBlockSchema } from './article.schema';
import { imageResourceSchema } from './common.schema';

export const serviceSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  footerTitle: z.string().min(1),
  footerHint: z.string().min(1),
  coverImage: imageResourceSchema,
  icon: imageResourceSchema,
  iconTone: z.enum(['blue', 'gold']),
  showOnline: z.boolean(),
  kind: z.enum(['hero', 'insight']),
  kicker: z.string().optional(),
  english: z.string().optional(),
  caption: z.string().optional(),
  tag: z.string().optional(),
});

export const servicesFileSchema = z.object({
  heroCards: z.array(serviceSummarySchema),
  insightCovers: z.array(serviceSummarySchema),
  details: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      summary: z.string().min(1),
      coverImage: imageResourceSchema,
      richContent: z.array(articleContentBlockSchema),
      relatedIds: z.array(z.string()),
    }),
  ),
});
