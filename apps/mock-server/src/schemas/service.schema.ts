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
  type: z.enum(['cover', 'contents', 'content', 'sheet']),
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

export const insightReportSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    titleEn: z.string().min(1),
    caption: z.string().min(1),
    kicker: z.string().min(1),
    english: z.string().min(1),
    coverImage: imageResourceSchema,
    gating: z.boolean(),
    tag: z.string().optional(),
    /** 相对 `files/` 的 PDF 文件名（建议 ASCII；也支持中文文件名） */
    pdfFile: z
      .string()
      .regex(/^[^/\\]+\.pdf$/i, 'pdfFile 必须是 files/ 下的 .pdf 文件名（不可含路径）')
      .optional(),
    pages: z.array(insightReportPageSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const hasPdf = Boolean(data.pdfFile);
    const hasPages = Boolean(data.pages && data.pages.length > 0);
    if (!hasPdf && !hasPages) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'insight 报告至少需要 pdfFile 或 pages 之一',
        path: ['pdfFile'],
      });
    }
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
