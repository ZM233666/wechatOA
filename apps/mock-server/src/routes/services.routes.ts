import { Router } from 'express';
import {
  getInsightReportDetail,
  getInsightReports,
  getMyDashboardModules,
  getServiceDetail,
  getServices,
} from '../controllers/services.controller';

export const servicesRouter = Router();
servicesRouter.get('/services', getServices);
servicesRouter.get('/services/my-dashboard/modules', getMyDashboardModules);
servicesRouter.get('/services/insights', getInsightReports);
servicesRouter.get('/services/insights/:id', getInsightReportDetail);
servicesRouter.get('/services/:id', getServiceDetail);
