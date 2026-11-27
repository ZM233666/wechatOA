import { getCases, prefetchCaseDetail, type ProjectCaseView } from './cases.service';
import { fallbackImageUrl } from '../../utils/format';
import { friendlyUnavailablePageData, logPageLoadIssue, standbyContentFields } from '../../utils/friendly-page-error';

Page({
  data: {
    cases: [] as ProjectCaseView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    listRefreshing: false,
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
    const keepList = this.data.cases.length > 0;
    this.setData(
      keepList
        ? { requesting: true, listRefreshing: true, errorText: '' }
        : { requesting: true, listRefreshing: false, pageStatus: 'loading', errorText: '' },
    );
    try {
      const cases = await getCases();
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({
        cases,
        requesting: false,
        listRefreshing: false,
        pageStatus: cases.length === 0 ? 'empty' : 'success',
        ...(cases.length === 0 ? standbyContentFields() : { emptyTitle: '', emptyDesc: '' }),
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      logPageLoadIssue('cases', error);
      if (keepList) {
        this.setData({ requesting: false, listRefreshing: false });
        wx.showToast({ title: '刷新失败，请稍后重试', icon: 'none' });
        return;
      }
      this.setData({
        requesting: false,
        listRefreshing: false,
        ...friendlyUnavailablePageData(),
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

  onCaseTouchStart(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    prefetchCaseDetail(id);
  },

  onCaseTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    prefetchCaseDetail(id);
    wx.navigateTo({
      url: `/pages/cases/detail?id=${id}`,
    });
  },
});
