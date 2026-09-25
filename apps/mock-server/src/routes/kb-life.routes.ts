import { Router } from 'express';
import {
  getActivities,
  getCampusMap,
  getCanteen,
  getHolidayCalendar,
  getKbLifeEntries,
  getShuttle,
  getShuttleTripPlan,
  getWetalkIssueDetail,
  getWetalkIssues,
} from '../controllers/kb-life.controller';

export const kbLifeRouter = Router();
kbLifeRouter.get('/kb-life/entries', getKbLifeEntries);
kbLifeRouter.get('/kb-life/canteen', getCanteen);
kbLifeRouter.get('/kb-life/shuttle', getShuttle);
kbLifeRouter.get('/kb-life/shuttle/trip-plan', getShuttleTripPlan);
kbLifeRouter.get('/kb-life/activities', getActivities);
kbLifeRouter.get('/kb-life/wetalk', getWetalkIssues);
kbLifeRouter.get('/kb-life/wetalk/:id', getWetalkIssueDetail);
kbLifeRouter.get('/kb-life/campus-map', getCampusMap);
kbLifeRouter.get('/kb-life/holiday-calendar', getHolidayCalendar);
