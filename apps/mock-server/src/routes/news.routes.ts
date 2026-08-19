import { Router } from 'express';
import { getNewsCategories, getNewsDetail, getNewsList } from '../controllers/news.controller';

export const newsRouter = Router();
newsRouter.get('/news/categories', getNewsCategories);
newsRouter.get('/news', getNewsList);
newsRouter.get('/news/:id', getNewsDetail);
