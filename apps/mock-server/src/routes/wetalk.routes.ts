import { Router } from 'express';
import {
  getWetalkCover,
  getWetalkReader,
  getWetalkReaderPage,
  getWetalkEmagazineDetail,
  getWetalkEmagazineList,
  getWetalkNewsDetailMini,
  getWetalkNewsListMini,
} from '../controllers/wetalk.controller';

/** 对齐 Django Mini：/api/wetalk/news、/api/wetalk/emagazines */
export const wetalkRouter = Router();
wetalkRouter.get('/wetalk/news', getWetalkNewsListMini);
wetalkRouter.get('/wetalk/news/:id', getWetalkNewsDetailMini);
wetalkRouter.get('/wetalk/emagazines', getWetalkEmagazineList);
wetalkRouter.get('/wetalk/emagazines/:id', getWetalkEmagazineDetail);

wetalkRouter.get('/wetalk/:resource/:id/cover', getWetalkCover);
wetalkRouter.get('/wetalk/:resource/:id/reader', getWetalkReader);
wetalkRouter.get('/wetalk/:resource/:id/reader/pages/:version/:page', getWetalkReaderPage);
