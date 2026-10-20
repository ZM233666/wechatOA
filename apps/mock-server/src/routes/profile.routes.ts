import { Router } from 'express';
import {
  getIdentityBinding,
  postIdentityBinding,
} from '../controllers/identity-binding.controller';
import { getProfile } from '../controllers/profile.controller';

export const profileRouter = Router();
profileRouter.get('/profile', getProfile);
profileRouter.get('/profile/identity-binding', getIdentityBinding);
profileRouter.post('/profile/identity-binding', postIdentityBinding);
