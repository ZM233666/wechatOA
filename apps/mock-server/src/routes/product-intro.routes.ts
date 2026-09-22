import { Router } from 'express';
import {
  getProductIntroDetail,
  getProductIntroList,
  getProductIntroSystems,
} from '../controllers/product-intro.controller';

export const productIntroRouter = Router();
productIntroRouter.get('/product-intro/systems', getProductIntroSystems);
productIntroRouter.get('/product-intro/public/:system/products', getProductIntroList);
productIntroRouter.get('/product-intro/public/:system/products/', getProductIntroList);
productIntroRouter.get('/product-intro/public/:system/products/:id', getProductIntroDetail);
productIntroRouter.get('/product-intro/public/:system/products/:id/', getProductIntroDetail);
