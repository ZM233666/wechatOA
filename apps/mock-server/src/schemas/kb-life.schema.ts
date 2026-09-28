import { z } from 'zod';
import { imageResourceSchema } from './common.schema';

export const kbLifeEntriesSchema = z.object({
  banners: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      image: imageResourceSchema,
    }),
  ),
  locations: z.array(z.string().min(1)),
  campusServices: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      icon: imageResourceSchema,
      path: z.string().optional(),
    }),
  ),
  employeeServices: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      icon: imageResourceSchema,
      path: z.string().optional(),
    }),
  ),
});

export const canteenSchema = z.object({
  intro: z.string().min(1),
  menuItems: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      image: imageResourceSchema,
    }),
  ),
});

export const shuttleSchema = z.object({
  notice: z.string().min(1),
  routes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      stops: z.array(
        z.object({
          time: z.string().optional(),
          name: z.string().min(1),
          note: z.string().optional(),
        }),
      ),
      stationsText: z.string().min(1),
    }),
  ),
});

const annualDinnerDetailSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string(),
  infoTitle: z.string().min(1),
  time: z.string(),
  venue: z.string(),
  dressCode: z.string(),
  highlightsTitle: z.string().min(1),
  highlights: z.array(z.string()),
});

const healthCheckupDetailSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string(),
  pdfUrl: z.string().min(1).optional(),
  pdfFileName: z.string().min(1).optional(),
  images: z.array(imageResourceSchema),
});

export const activitiesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      icon: imageResourceSchema,
      iconBg: z.string().min(1),
      path: z.string().min(1),
    }),
  ),
  live: z.boolean().optional(),
  outingsMeta: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
  }),
  annualDinner: annualDinnerDetailSchema.nullable(),
  outings: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      descriptionCn: z.string(),
      descriptionEn: z.string(),
      timeLabel: z.string(),
      status: z.enum(['open', 'closed']),
      statusText: z.string().min(1),
    }),
  ),
  health: healthCheckupDetailSchema.nullable(),
});

export const wetalkTocItemSchema = z.object({
  index: z.string().min(1),
  titleEn: z.string().min(1),
  titleCn: z.string().min(1),
  lines: z.array(z.string().min(1)).min(1),
});

export const wetalkPageSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['cover', 'contents', 'content', 'sheet']),
  title: z.string().min(1),
  coverImage: imageResourceSchema.optional(),
  headlineCn: z.array(z.string().min(1)).optional(),
  headlineEn: z.string().optional(),
  institute: z.string().optional(),
  brand: z.string().optional(),
  toc: z.array(wetalkTocItemSchema).optional(),
  chapterLabel: z.string().optional(),
  chapterTitle: z.string().optional(),
  bodyImage: imageResourceSchema.optional(),
  paragraphs: z.array(z.string().min(1)).optional(),
  bullets: z.array(z.string().min(1)).optional(),
});

export const wetalkIssueSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    date: z.string().min(1),
    coverImage: imageResourceSchema,
    /** 相对 `files/` 的 PDF 文件名（建议 ASCII；也支持中文文件名） */
    pdfFile: z
      .string()
      .regex(/^[^/\\]+\.pdf$/i, 'pdfFile 必须是 files/ 下的 .pdf 文件名（不可含路径）')
      .optional(),
    pages: z.array(wetalkPageSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const hasPdf = Boolean(data.pdfFile);
    const hasPages = Boolean(data.pages && data.pages.length > 0);
    if (!hasPdf && !hasPages) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'WeTalk 期次至少需要 pdfFile 或 pages 之一',
        path: ['pdfFile'],
      });
    }
  });

export const campusMapPageSchema = z.object({
  id: z.string().min(1),
  type: z.literal('sheet'),
  title: z.string().min(1),
  coverImage: imageResourceSchema,
});

export const campusMapSchema = z.object({
  title: z.string().min(1),
  image: imageResourceSchema,
  /** 相对 `locations/{Location}/Map/` 的 PDF 文件名；也可由目录自动发现 */
  pdfFile: z
    .string()
    .regex(/^[^/\\]+\.pdf$/i, 'pdfFile 必须是 Map/ 下的 .pdf 文件名')
    .optional(),
  pages: z.array(campusMapPageSchema).optional(),
});

export const holidayMarkSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['holiday', 'workday']),
});

export const holidayCalendarSchema = z.object({
  year: z.number().int().positive(),
  location: z.string().min(1),
  marks: z.record(z.string().min(1), holidayMarkSchema),
});

export const employeeHandbookSchema = z.object({
  title: z.string().min(1),
  edition: z.string().min(1),
  introCn: z.string().min(1),
  introEn: z.string().min(1),
  /** 相对 handbook/files 的文件名；留空则自动选 MinIO/本地最新 PDF */
  pdfFile: z.string().optional(),
});
