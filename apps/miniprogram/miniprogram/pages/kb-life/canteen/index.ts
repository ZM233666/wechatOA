import { getCanteen, type CanteenMenuItem } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';
import { resolveCampusLocation } from '../../../utils/campus-location';

Page({
  data: {
    location: '',
    intro: '',
    menuItems: [] as CanteenMenuItem[],
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  onLoad(query: Record<string, string | undefined>) {
    this.location = resolveCampusLocation(query.location);
    this.setData({ location: this.location });
    void this.loadCanteen();
  },

  location: '' as string,

  async loadCanteen() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getCanteen(this.location);
      this.setData({
        location: result.location,
        intro: result.intro,
        menuItems: result.menuItems,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '食堂菜单加载失败',
      });
    }
  },
});
