import { Router } from 'express';
import { getProfile } from '../controllers/profile.controller';

export const profileRouter = Router();
profileRouter.get('/profile', getProfile);
