import {
  filterShuttleRoutes,
  getShuttle,
  type ShuttleRoute,
} from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';

Page({
  data: {
    keyword: '',
    routes: [] as ShuttleRoute[],
    allRoutes: [] as ShuttleRoute[],
    notice: '',
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  onLoad() {
    void this.loadShuttle();
  },

  async loadShuttle() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getShuttle();
      this.setData({
        notice: result.notice,
        allRoutes: result.routes,
        routes: filterShuttleRoutes(result.routes, this.data.keyword),
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '班车信息加载失败',
      });
    }
  },

  onSearchInput(event: WechatMiniprogram.Input) {
    const keyword = event.detail.value;
    this.setData({
      keyword,
      routes: filterShuttleRoutes(this.data.allRoutes, keyword),
    });
  },
});
