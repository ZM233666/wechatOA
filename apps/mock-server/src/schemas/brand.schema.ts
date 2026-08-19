import type { z } from 'zod';
import { articleDetailSchema } from './article.schema';
import { brandOverviewSchema } from './home.schema';

export const brandArticleSchema = articleDetailSchema;
export const brandOverviewFileSchema = brandOverviewSchema;

export type BrandOverview = z.infer<typeof brandOverviewSchema>;
