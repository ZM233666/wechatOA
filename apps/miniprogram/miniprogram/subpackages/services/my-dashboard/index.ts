import { buildServiceFeatureIntroUrl } from '../../../constants/routes';
import { getMyDashboardModules, type MyDashboardModule } from '../../../services/services.service';
import { handleIdentityAccessFailure, rejectUnboundIdentityAccess } from '../../../utils/identity-access';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../utils/friendly-page-error';

const MODULE_DESCRIPTIONS: Record<string, string> = {
  'ftq-system':
    'FTQ System 面向一次合格质量，汇总质量结果，帮助团队了解产品与过程的一次通过情况，并识别需要改进的环节。',
};

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
        ...(modules.length
          ? { emptyTitle: '', emptyDesc: '' }
          : { emptyTitle: '暂无系统模块', emptyDesc: '当前没有可展示的系统模块。' }),
      });
    } catch (error) {
      logPageLoadIssue('my-dashboard', error);
      if (handleIdentityAccessFailure(error, { title: 'My Dashboard' })) {
        return;
      }
      this.setData(friendlyUnavailablePageData());
    }
  },

  onModuleTap(event: WechatMiniprogram.TouchEvent) {
    const { id, title } = event.currentTarget.dataset as { id?: string; title?: string };
    if (id === 'fast-phm') {
      wx.navigateTo({ url: buildServiceFeatureIntroUrl('fast-phm') });
      return;
    }
    const name = title?.trim() || '该系统模块';
    wx.showModal({
      title: name,
      content:
        (id && MODULE_DESCRIPTIONS[id]) ||
        `${name}用于了解该系统的用途与关注重点。本页提供模块说明。`,
      showCancel: false,
      confirmText: '知道了',
    });
  },
});
