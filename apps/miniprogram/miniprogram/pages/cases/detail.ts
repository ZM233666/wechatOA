import { getCaseDetail, type ProjectCaseView } from '../../services/cases.service';
import { RequestError } from '../../types/api';
import { fallbackImageUrl } from '../../utils/format';

Page({
  data: {
    caseId: '',
    item: null as ProjectCaseView | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    pageAlive: true,
    requesting: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ pageAlive: true, caseId: query.id ?? '' });
    void this.loadDetail();
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  async loadDetail() {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    const id = this.data.caseId;
    if (!id) {
      this.setData({ pageStatus: 'empty', item: null });
      return;
    }
    this.data.requesting = true;
    this.setData({ requesting: true, pageStatus: 'loading', errorText: '' });
    try {
      const item = await getCaseDetail(id);
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({ item, pageStatus: 'success', requesting: false });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      const status = error instanceof RequestError && error.statusCode === 404 ? 'empty' : 'error';
      this.data.requesting = false;
      this.setData({
        item: null,
        pageStatus: status,
        requesting: false,
        errorText: error instanceof RequestError ? error.message : '案例详情加载失败',
      });
    }
  },

  onRetry() {
    void this.loadDetail();
  },

  onCoverImageError() {
    if (!this.data.item) {
      return;
    }
    this.setData({
      item: {
        ...this.data.item,
        image: fallbackImageUrl(this.data.item.image),
      },
    });
  },

  onSave() {
    wx.showToast({
      title: 'Added to Favorites',
      icon: 'none',
    });
  },
});
