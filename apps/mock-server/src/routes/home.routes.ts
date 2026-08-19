import { Router } from 'express';
import { getHome } from '../controllers/home.controller';

export const homeRouter = Router();
homeRouter.get('/home', getHome);
