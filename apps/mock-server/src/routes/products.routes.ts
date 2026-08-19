import { Router } from 'express';
import { getProductCategories, getProductDetail, getProducts } from '../controllers/products.controller';

export const productsRouter = Router();
productsRouter.get('/products/categories', getProductCategories);
productsRouter.get('/products', getProducts);
productsRouter.get('/products/:id', getProductDetail);
