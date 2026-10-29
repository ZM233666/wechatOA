import { z } from 'zod';
import { categorySchema, imageResourceSchema } from './common.schema';

export const richTextSpanSchema = z.object({
  type: z.enum(['text', 'link']),
  text: z.string().min(1),
  href: z.string().optional(),
  marks: z.array(z.enum(['bold', 'italic', 'underline'])).optional(),
});

export const headingBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().min(1),
  align: z.enum(['left', 'center', 'right']).optional(),
});

export const paragraphBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('paragraph'),
  align: z.enum(['left', 'center', 'right']).optional(),
  spans: z.array(richTextSpanSchema).min(1),
});

export const imageBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('image'),
  image: imageResourceSchema,
  caption: z.string().optional(),
  layout: z.enum(['normal', 'wide', 'full']).optional(),
});

export const quoteBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('quote'),
  text: z.string().min(1),
  source: z.string().optional(),
});

export const listBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('list'),
  ordered: z.boolean(),
  items: z.array(z.string().min(1)).min(1),
});

export const dividerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('divider'),
});

export const calloutBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('callout'),
  variant: z.enum(['info', 'warning', 'success', 'exclusive']),
  title: z.string().optional(),
  text: z.string().min(1),
});

export const linkBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('link'),
  text: z.string().min(1),
  url: z.string().min(1),
  linkType: z.enum(['internal', 'external']),
});

export const mediaCarouselBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('carousel'),
  slides: z.array(imageResourceSchema).min(1),
  caption: z.string().optional(),
  autoplay: z.boolean().optional(),
  interval: z.number().int().positive().optional(),
  loop: z.boolean().optional(),
});

export const videoBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('video'),
  src: z.string().min(1),
  poster: z.string().optional(),
  caption: z.string().optional(),
});

export const articleContentBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  imageBlockSchema,
  quoteBlockSchema,
  listBlockSchema,
  dividerBlockSchema,
  calloutBlockSchema,
  linkBlockSchema,
  mediaCarouselBlockSchema,
  videoBlockSchema,
]);

export const articleDetailSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string(),
  summary: z.string().min(1),
  category: categorySchema,
  author: z.object({
    name: z.string().min(1),
  }),
  publishedAt: z.string().datetime(),
  coverImage: imageResourceSchema,
  richContent: z.array(articleContentBlockSchema).min(1),
  tags: z.array(z.string()),
  relatedIds: z.array(z.string()),
  share: z.object({
    title: z.string().min(1),
    imageUrl: z.string().startsWith('/mock-assets/'),
  }),
});
