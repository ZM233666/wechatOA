import { COMING_SOON_TOAST } from '../../constants/routes';
import { getServices, type InsightCover, type ServiceHeroCard } from '../../services/services.service';
import { RequestError } from '../../types/api';

Page({
  data: {
    heroCards: [] as ServiceHeroCard[],
    insightCovers: [] as InsightCover[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
  },

  onLoad() {
    void this.loadServices();
  },

  async loadServices() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getServices();
      const empty = result.heroCards.length === 0 && result.insightCovers.length === 0;
      this.setData({
        heroCards: result.heroCards,
        insightCovers: result.insightCovers,
        pageStatus: empty ? 'empty' : 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '服务加载失败',
      });
    }
  },

  onComingSoon() {
    wx.showToast({
      title: COMING_SOON_TOAST,
      icon: 'none',
    });
  },
});
