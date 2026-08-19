import { z } from 'zod';
import { articleContentBlockSchema } from './article.schema';
import { categorySchema, imageResourceSchema } from './common.schema';

export const newsCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const newsTagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const newsSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1).max(160),
  subtitle: z.string(),
  summary: z.string().min(1).max(220),
  category: categorySchema,
  publishedAt: z.string().datetime(),
  coverImage: imageResourceSchema,
  thumbnailImage: imageResourceSchema.optional(),
  featured: z.boolean(),
  pinned: z.boolean(),
  tags: z.array(newsTagSchema),
});

export const newsPublicationStatusSchema = z.enum(['draft', 'scheduled', 'published', 'archived']);

export const newsArticleFixtureSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    status: newsPublicationStatusSchema,
    language: z.string().min(1),
    title: z.string().min(1).max(160),
    subtitle: z.string(),
    summary: z.string().min(1).max(220),
    category: categorySchema,
    author: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      avatar: imageResourceSchema.nullable(),
    }),
    source: z.object({
      name: z.string().min(1),
      url: z.string().url().nullable(),
    }),
    coverImage: imageResourceSchema,
    thumbnailImage: imageResourceSchema.optional(),
    tags: z.array(newsTagSchema),
    placement: z.object({
      showOnHome: z.boolean(),
      showOnBanner: z.boolean(),
      featured: z.boolean(),
      pinned: z.boolean(),
      sortOrder: z.number().int(),
    }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    publishedAt: z.string().datetime().nullable(),
    scheduledAt: z.string().datetime().nullable(),
    richContent: z.array(articleContentBlockSchema).min(1),
    relatedArticleIds: z.array(z.string()),
    share: z.object({
      title: z.string().min(1),
      summary: z.string().min(1),
      imageUrl: z.string().startsWith('/mock-assets/'),
    }),
  })
  .superRefine((article, ctx) => {
    if (article.status === 'published' && !article.publishedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publishedAt'],
        message: 'published 文章必须有 publishedAt',
      });
    }
    if (article.status === 'scheduled' && !article.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduledAt'],
        message: 'scheduled 文章必须有 scheduledAt',
      });
    }
    if (article.relatedArticleIds.includes(article.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['relatedArticleIds'],
        message: '文章不能关联自身',
      });
    }
  });

export type NewsArticleFixture = z.infer<typeof newsArticleFixtureSchema>;

/** @deprecated 列表由 articles 映射生成，不再作为独立 fixture 读取 */
export const newsListSchema = z.array(newsSummarySchema);
export const newsCategoriesSchema = z.array(newsCategorySchema);
export const newsArticleSchema = newsArticleFixtureSchema;
