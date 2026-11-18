import { getOpenPositionDetail, type OpenPositionDetailView } from '../../../services/kb-life.service';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../utils/friendly-page-error';

Page({
  data: {
    job: null as OpenPositionDetailView | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'empty',
    emptyTitle: '',
    emptyDesc: '',
    errorText: '',
  },

  onLoad(query: Record<string, string | undefined>) {
    const id = (query.id ?? '').trim();
    if (!id) {
      this.setData(friendlyUnavailablePageData({ title: '暂无岗位信息' }));
      return;
    }
    void this.loadJob(id);
  },

  async loadJob(id: string) {
    this.setData({ pageStatus: 'loading', errorText: '', job: null });
    try {
      const job = await getOpenPositionDetail(id);
      this.setData({ job, pageStatus: 'success' });
    } catch (error) {
      logPageLoadIssue('open-position-detail', error);
      this.setData({ ...friendlyUnavailablePageData({ title: '暂无岗位信息' }), job: null });
    }
  },

  onApply() {
    wx.showToast({
      title: '请通过 HR 渠道投递',
      icon: 'none',
    });
  },
});
