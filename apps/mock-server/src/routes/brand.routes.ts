import { Router } from 'express';
import { getBrand, getBrandArticleDetail, getBrandArticles } from '../controllers/brand.controller';

export const brandRouter = Router();
brandRouter.get('/brand', getBrand);
brandRouter.get('/brand/articles', getBrandArticles);
brandRouter.get('/brand/articles/:id', getBrandArticleDetail);
