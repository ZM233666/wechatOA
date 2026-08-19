import { getCanteen, type CanteenMenuItem } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';

Page({
  data: {
    intro: '',
    menuItems: [] as CanteenMenuItem[],
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  onLoad() {
    void this.loadCanteen();
  },

  async loadCanteen() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getCanteen();
      this.setData({
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
