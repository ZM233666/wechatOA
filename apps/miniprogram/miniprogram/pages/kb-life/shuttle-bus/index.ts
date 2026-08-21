import {
  filterShuttleRoutes,
  getShuttle,
  type ShuttleRoute,
} from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';
import { resolveCampusLocation } from '../../../utils/campus-location';

Page({
  data: {
    location: '',
    keyword: '',
    routes: [] as ShuttleRoute[],
    allRoutes: [] as ShuttleRoute[],
    notice: '',
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  onLoad(query: Record<string, string | undefined>) {
    this.location = resolveCampusLocation(query.location);
    this.setData({ location: this.location });
    void this.loadShuttle();
  },

  location: '' as string,

  async loadShuttle() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getShuttle(this.location);
      this.setData({
        location: result.location,
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
