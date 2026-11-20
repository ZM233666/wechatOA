import { buildServiceFeatureIntroUrl } from '../../../constants/routes';
import { getMyDashboardModules, type MyDashboardModule } from '../../../services/services.service';
import { enrichOnlineStatusFromExternalUrl } from '../../../utils/external-url';
import { showComingSoonModal } from '../coming-soon';
import { rejectUnboundIdentityAccess } from '../../../utils/identity-access';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../utils/friendly-page-error';

Page({
  data: {
    modules: [] as MyDashboardModule[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
  },

  onLoad() {
    if (rejectUnboundIdentityAccess('/pages/services/index', 'My Dashboard')) {
      return;
    }
    void this.loadModules();
  },

  async loadModules() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const modules = await getMyDashboardModules();
      this.setData({
        modules,
        pageStatus: modules.length ? 'success' : 'empty',
      });
    } catch (error) {
      logPageLoadIssue('my-dashboard', error);
      this.setData(friendlyUnavailablePageData());
    }
  },

  onModuleTap(event: WechatMiniprogram.TouchEvent) {
    const { id, title } = event.currentTarget.dataset as { id?: string; title?: string };
    if (id === 'fast-phm') {
      wx.navigateTo({ url: buildServiceFeatureIntroUrl('fast-phm') });
      return;
    }
    showComingSoonModal(title);
  },
});
