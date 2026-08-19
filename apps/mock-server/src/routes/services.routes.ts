import { Router } from 'express';
import { getServiceDetail, getServices } from '../controllers/services.controller';

export const servicesRouter = Router();
servicesRouter.get('/services', getServices);
servicesRouter.get('/services/:id', getServiceDetail);
