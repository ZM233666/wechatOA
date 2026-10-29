import {
  getFinancialGuidanceHandbook,
  type FinancialGuidanceSectionView,
} from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';

Page({
  data: {
    title: '',
    edition: '',
    introCn: '',
    introEn: '',
    sections: [] as FinancialGuidanceSectionView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  navLocked: false,
  navLockTimer: 0 as number,

  onLoad() {
    void this.loadHandbook();
  },

  onShow() {
    this.navLocked = true;
    if (this.navLockTimer) {
      clearTimeout(this.navLockTimer);
    }
    this.navLockTimer = setTimeout(() => {
      this.navLocked = false;
      this.navLockTimer = 0;
    }, 350) as unknown as number;
  },

  onUnload() {
    if (this.navLockTimer) {
      clearTimeout(this.navLockTimer);
      this.navLockTimer = 0;
    }
  },

  async loadHandbook() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const result = await getFinancialGuidanceHandbook();
      this.setData({
        title: result.title,
        edition: result.edition,
        introCn: result.introCn,
        introEn: result.introEn,
        sections: result.sections,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '财务指导手册加载失败',
      });
    }
  },

  onSectionTap(event: WechatMiniprogram.TouchEvent) {
    if (this.navLocked) {
      return;
    }
    const { id } = event.currentTarget.dataset as { id?: string };
    if (id !== 'notes' && id !== 'manual') {
      return;
    }
    this.navLocked = true;
    wx.navigateTo({
      url: `/subpackages/kb-life/financial-handbook/document/index?section=${id}`,
      complete: () => {
        setTimeout(() => {
          this.navLocked = false;
        }, 350);
      },
    });
  },
});
