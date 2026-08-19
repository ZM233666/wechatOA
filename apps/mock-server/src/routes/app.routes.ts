import { Router } from 'express';
import { getAppConfig, getHealth } from '../controllers/app.controller';

export const appRouter = Router();
appRouter.get('/health', getHealth);
appRouter.get('/app/config', getAppConfig);
