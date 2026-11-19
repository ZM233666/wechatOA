import { COMING_SOON_TOAST, MY_DASHBOARD_PAGE_PATH } from '../../constants/routes';
import {
  getInsightReports,
  getServices,
  readPersistedServicesView,
  type InsightCover,
  type ServiceHeroCard,
} from '../../services/services.service';
import { hasStoredIdentityBinding } from '../../utils/identity-access';
import {
  bindIdentitySessionRefresh,
  refreshIfIdentitySessionChanged,
  unbindIdentitySessionRefresh,
} from '../../utils/identity-session-refresh';
import { openInsightContent } from '../../utils/insights';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../utils/friendly-page-error';
import {
  openServiceFeatureIntro,
  resolveServiceHeroFeature,
} from '../../utils/service-hero-navigation';

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
    bindIdentitySessionRefresh(this, () => {
      void this.reloadServicesForIdentity();
    });
    const persisted = readPersistedServicesView();
    if (persisted) {
      const empty = persisted.heroCards.length === 0 && persisted.insightCovers.length === 0;
      this.setData({
        heroCards: persisted.heroCards,
        insightCovers: persisted.insightCovers,
        pageStatus: empty ? 'empty' : 'success',
      });
    }
    void this.loadServices(Boolean(persisted));
  },

  onUnload() {
    unbindIdentitySessionRefresh(this);
  },

  onShow() {
    refreshIfIdentitySessionChanged(this, () => {
      void this.reloadServicesForIdentity();
    });
  },

  reloadServicesForIdentity() {
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

  async loadServices(silent = false) {
    const keepContent =
      silent ||
      (this.data.pageStatus === 'success' &&
        (this.data.heroCards.length > 0 || this.data.insightCovers.length > 0));
    if (!keepContent) {
      this.setData({ pageStatus: 'loading' });
    }
    try {
      const result = await getServices();
      const empty = result.heroCards.length === 0 && result.insightCovers.length === 0;
      this.setData({
        heroCards: result.heroCards,
        insightCovers: result.insightCovers,
        pageStatus: empty ? 'empty' : 'success',
      });
    } catch (error) {
      if (!keepContent) {
        this.setData({
          pageStatus: 'empty',
          ...friendlyUnavailablePageData(),
        });
      }
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
      logPageLoadIssue('services-insights', error);
      const { emptyTitle, emptyDesc, errorText } = friendlyUnavailablePageData();
      this.setData({ listStatus: 'empty', emptyTitle, emptyDesc, errorText });
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

  onHeroTap(event: WechatMiniprogram.TouchEvent) {
    const { heroId, title, index } = event.currentTarget.dataset as {
      heroId?: string;
      title?: string;
      index?: number | string;
    };
    const cardIndex = typeof index === 'number' ? index : Number(index);
    const card =
      Number.isInteger(cardIndex) && cardIndex >= 0 ? this.data.heroCards[cardIndex] : undefined;
    const feature = resolveServiceHeroFeature(heroId || card?.id, title || card?.title);
    if (feature === 'digital-cbm') {
      openServiceFeatureIntro('digital-cbm');
      return;
    }
    if (feature === 'fast-phm') {
      if (!hasStoredIdentityBinding()) {
        openServiceFeatureIntro('fast-phm');
        return;
      }
      wx.navigateTo({ url: MY_DASHBOARD_PAGE_PATH });
      return;
    }
    this.onComingSoon();
  },

  onComingSoon() {
    wx.showToast({
      title: COMING_SOON_TOAST,
      icon: 'none',
    });
  },
});
