import { z } from 'zod';
import { articleContentBlockSchema } from './article.schema';
import { categorySchema, imageResourceSchema } from './common.schema';

export const caseCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const caseSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  category: categorySchema,
  coverImage: imageResourceSchema,
  region: z.string().min(1),
  industry: z.string().min(1),
  featured: z.boolean(),
});

export const caseDetailSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  category: categorySchema,
  coverImage: imageResourceSchema,
  region: z.string().min(1),
  industry: z.string().min(1),
  meta: z.string().min(1),
  background: z.string().min(1),
  solution: z.string().min(1),
  richContent: z.array(articleContentBlockSchema),
  relatedIds: z.array(z.string()),
  publishedAt: z.string().datetime(),
});
