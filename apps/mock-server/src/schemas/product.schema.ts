import { z } from 'zod';
import { articleContentBlockSchema } from './article.schema';
import { categorySchema, imageResourceSchema } from './common.schema';

export const productCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameCn: z.string().min(1),
  subtitleEn: z.string().min(1),
  description: z.string().min(1),
  coverImage: imageResourceSchema,
  featuredProductId: z.string().min(1),
});

export const productHeroSlideSchema = z.object({
  title: z.string().min(1),
  image: imageResourceSchema,
});

export const productCategoriesFileSchema = z.object({
  slides: z.array(productHeroSlideSchema),
  categories: z.array(productCategorySchema),
});

export const productSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameCn: z.string().min(1),
  summary: z.string().min(1),
  category: categorySchema,
  coverImage: imageResourceSchema,
  featured: z.boolean(),
});

export const productDetailSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  nameCn: z.string().min(1),
  subtitleEn: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  category: categorySchema,
  coverImage: imageResourceSchema,
  gallery: z.array(imageResourceSchema),
  relatedProducts: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      image: imageResourceSchema,
    }),
  ),
  richContent: z.array(articleContentBlockSchema),
  relatedIds: z.array(z.string()),
  publishedAt: z.string().datetime(),
});
