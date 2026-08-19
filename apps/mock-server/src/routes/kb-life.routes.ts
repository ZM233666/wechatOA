import { Router } from 'express';
import { getActivities, getCanteen, getKbLifeEntries, getShuttle } from '../controllers/kb-life.controller';

export const kbLifeRouter = Router();
kbLifeRouter.get('/kb-life/entries', getKbLifeEntries);
kbLifeRouter.get('/kb-life/canteen', getCanteen);
kbLifeRouter.get('/kb-life/shuttle', getShuttle);
kbLifeRouter.get('/kb-life/activities', getActivities);
