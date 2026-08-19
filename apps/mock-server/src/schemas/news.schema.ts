import { z } from 'zod';
import { newsCategorySchema, newsSummarySchema } from './home.schema';
import { newsArticleSchema } from './home.schema';

export { newsArticleSchema, newsCategorySchema, newsSummarySchema };

export const newsListSchema = z.array(newsSummarySchema);
export const newsCategoriesSchema = z.array(newsCategorySchema);
