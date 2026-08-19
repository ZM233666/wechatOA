import { getCases, type ProjectCaseView } from '../../services/cases.service';
import { RequestError } from '../../types/api';
import { fallbackImageUrl } from '../../utils/format';

Page({
  data: {
    cases: [] as ProjectCaseView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    pageAlive: true,
    requesting: false,
  },

  onLoad() {
    this.setData({ pageAlive: true });
    void this.loadCases();
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  async loadCases() {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    this.data.requesting = true;
    this.setData({ requesting: true, pageStatus: 'loading', errorText: '' });
    try {
      const cases = await getCases();
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({
        cases,
        requesting: false,
        pageStatus: cases.length === 0 ? 'empty' : 'success',
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({
        requesting: false,
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '案例加载失败',
      });
    }
  },

  onRetry() {
    void this.loadCases();
  },

  onCaseImageError(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    this.setData({
      cases: this.data.cases.map((item) =>
        item.id === id ? { ...item, image: fallbackImageUrl(item.image) } : item,
      ),
    });
  },

  onCaseTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/cases/detail?id=${id}`,
    });
  },
});
