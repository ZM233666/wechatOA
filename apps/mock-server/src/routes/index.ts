import { Router } from 'express';
import { appRouter } from './app.routes';
import { homeRouter } from './home.routes';
import { newsRouter } from './news.routes';
import { brandRouter } from './brand.routes';
import { productsRouter } from './products.routes';
import { casesRouter } from './cases.routes';
import { servicesRouter } from './services.routes';
import { kbLifeRouter } from './kb-life.routes';
import { profileRouter } from './profile.routes';

export function createApiRouter(): Router {
  const router = Router();
  router.use(appRouter);
  router.use(homeRouter);
  router.use(newsRouter);
  router.use(brandRouter);
  router.use(productsRouter);
  router.use(casesRouter);
  router.use(servicesRouter);
  router.use(kbLifeRouter);
  router.use(profileRouter);
  return router;
}
