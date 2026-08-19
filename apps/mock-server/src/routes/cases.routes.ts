import { Router } from 'express';
import { getCaseCategories, getCaseDetail, getCases } from '../controllers/cases.controller';

export const casesRouter = Router();
casesRouter.get('/cases/categories', getCaseCategories);
casesRouter.get('/cases', getCases);
casesRouter.get('/cases/:id', getCaseDetail);
