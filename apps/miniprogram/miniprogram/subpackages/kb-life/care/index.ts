import {
  getEmployeeCare,
  type EmployeeCareHeroView,
  type EmployeeCareInitiativeView,
} from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';
import { rejectUnboundIdentityAccess } from '../../../utils/identity-access';

Page({
  data: {
    hero: {
      title: '',
      subtitle: '',
      image: '',
    } as EmployeeCareHeroView,
    initiatives: [] as EmployeeCareInitiativeView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
  },

  pendingInitiativeId: '' as string,
  accessAllowed: false,
  skipNextShowLoad: false,

  onLoad(query: Record<string, string | undefined>) {
    if (rejectUnboundIdentityAccess('/pages/kb-life/index')) {
      return;
    }
    this.accessAllowed = true;
    this.skipNextShowLoad = true;
    this.pendingInitiativeId = (query.initiativeId ?? '').trim();
    void this.loadCare();
  },

  onShow() {
    if (!this.accessAllowed) {
      return;
    }
    if (this.skipNextShowLoad) {
      this.skipNextShowLoad = false;
      return;
    }
    void this.loadCare({ silent: true });
  },

  async loadCare(options?: { silent?: boolean }) {
    const keepContent =
      Boolean(options?.silent) &&
      this.data.pageStatus === 'success' &&
      this.data.initiatives.length > 0;
    if (!keepContent) {
      this.setData({ pageStatus: 'loading', errorText: '' });
    }
    try {
      const result = await getEmployeeCare();
      const empty = !result.initiatives.length;
      this.setData({
        hero: result.hero,
        initiatives: result.initiatives,
        pageStatus: empty ? 'empty' : 'success',
      });
      const jumpId = this.pendingInitiativeId;
      if (jumpId && result.initiatives.some((item) => item.id === jumpId)) {
        this.pendingInitiativeId = '';
        wx.navigateTo({
          url: `/subpackages/kb-life/care/detail?id=${encodeURIComponent(jumpId)}`,
        });
      }
    } catch (error) {
      if (keepContent) {
        return;
      }
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '员工关怀加载失败',
      });
    }
  },

  onReadMore(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/subpackages/kb-life/care/detail?id=${encodeURIComponent(id)}`,
    });
  },
});
