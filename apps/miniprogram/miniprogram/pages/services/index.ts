import { COMING_SOON_TOAST } from '../../constants/routes';
import {
  getInsightReports,
  getServices,
  type InsightCover,
  type ServiceHeroCard,
} from '../../services/services.service';
import { RequestError } from '../../types/api';
import { openInsightContent } from '../../utils/insights';

Page({
  data: {
    heroCards: [] as ServiceHeroCard[],
    insightCovers: [] as InsightCover[],
    insightItems: [] as InsightCover[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    listStatus: 'idle' as 'idle' | 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    listErrorText: '',
    listVisible: false,
    readerVisible: false,
    readerReportId: '',
    navTitle: 'Services',
    shareTitle: 'KB Insights',
    shareImage: '',
  },

  onLoad() {
    void this.loadServices();
  },

  onShow() {
    if (this.data.pageStatus === 'loading') {
      return;
    }
    void this.loadServices();
    if (this.data.listVisible) {
      void this.loadInsightList();
    }
  },

  onShareAppMessage() {
    return {
      title: this.data.shareTitle || 'KB Insights',
      path: '/pages/services/index',
      imageUrl: this.data.shareImage || undefined,
    };
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

  async loadInsightList() {
    this.setData({ listStatus: 'loading', listErrorText: '' });
    try {
      const items = await getInsightReports();
      this.setData({
        insightItems: items,
        listStatus: items.length ? 'success' : 'empty',
      });
    } catch (error) {
      this.setData({
        listStatus: 'error',
        listErrorText: error instanceof RequestError ? error.message : '洞察列表加载失败',
      });
    }
  },

  onInsightTap(event: WechatMiniprogram.TouchEvent) {
    const { id, gating } = event.currentTarget.dataset as { id?: string; gating?: boolean | string };
    if (!id) {
      return;
    }
    const isGated = gating === true || gating === 'true';
    void openInsightContent({
      id,
      gating: isGated,
      onOpenReader: (reportId) => {
        this.setData({
          readerVisible: true,
          readerReportId: reportId,
        });
      },
    });
  },

  onReaderClose() {
    this.setData({
      readerVisible: false,
      readerReportId: '',
    });
  },

  onExploreMore() {
    this.setData({
      listVisible: true,
      navTitle: 'KB Insights',
    });
    void this.loadInsightList();
  },

  onListBack() {
    this.setData({
      listVisible: false,
      readerVisible: false,
      readerReportId: '',
      navTitle: 'Services',
    });
  },

  onComingSoon() {
    wx.showToast({
      title: COMING_SOON_TOAST,
      icon: 'none',
    });
  },
});
