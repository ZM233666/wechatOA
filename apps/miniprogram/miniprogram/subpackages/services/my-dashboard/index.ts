import { getMyDashboardModules, type MyDashboardModule } from '../../../services/services.service';
import { RequestError } from '../../../types/api';
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
      this.setData({
        pageStatus: 'empty',
        ...friendlyUnavailablePageData(),
      });
    }
  },

  onModuleTap(event: WechatMiniprogram.TouchEvent) {
    const { title } = event.currentTarget.dataset as { title?: string };
    showComingSoonModal(title);
  },
});
