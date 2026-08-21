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
  gating: z.boolean().optional(),
});

export const insightTocItemSchema = z.object({
  index: z.string().min(1),
  titleEn: z.string().min(1),
  titleCn: z.string().min(1),
  lines: z.array(z.string().min(1)).min(1),
});

export const insightReportPageSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['cover', 'contents', 'content']),
  title: z.string().min(1),
  coverImage: imageResourceSchema.optional(),
  headlineCn: z.array(z.string().min(1)).optional(),
  headlineEn: z.string().optional(),
  institute: z.string().optional(),
  brand: z.string().optional(),
  toc: z.array(insightTocItemSchema).optional(),
  chapterLabel: z.string().optional(),
  chapterTitle: z.string().optional(),
  bodyImage: imageResourceSchema.optional(),
  paragraphs: z.array(z.string().min(1)).optional(),
  bullets: z.array(z.string().min(1)).optional(),
});

export const insightReportSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  titleEn: z.string().min(1),
  caption: z.string().min(1),
  kicker: z.string().min(1),
  english: z.string().min(1),
  coverImage: imageResourceSchema,
  gating: z.boolean(),
  tag: z.string().optional(),
  pages: z.array(insightReportPageSchema).min(1),
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
