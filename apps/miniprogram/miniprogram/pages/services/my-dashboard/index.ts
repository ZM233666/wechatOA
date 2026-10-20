import { getMyDashboardModules, type MyDashboardModule } from '../../../services/services.service';
import { RequestError } from '../../../types/api';
import { showComingSoonModal } from '../../../utils/coming-soon';
import { rejectUnboundIdentityAccess } from '../../../utils/identity-access';

Page({
  data: {
    modules: [] as MyDashboardModule[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
  },

  onLoad() {
    if (rejectUnboundIdentityAccess()) {
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
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '模块加载失败',
      });
    }
  },

  onModuleTap(event: WechatMiniprogram.TouchEvent) {
    const { title } = event.currentTarget.dataset as { title?: string };
    showComingSoonModal(title);
  },
});
