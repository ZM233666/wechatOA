import { getOpenPositionDetail, type OpenPositionDetailView } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';

Page({
  data: {
    job: null as OpenPositionDetailView | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  onLoad(query: Record<string, string | undefined>) {
    const id = (query.id ?? '').trim();
    if (!id) {
      this.setData({ pageStatus: 'error', errorText: '缺少岗位 ID' });
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
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '岗位详情加载失败',
        job: null,
      });
    }
  },

  onApply() {
    wx.showToast({
      title: '请通过 HR 渠道投递',
      icon: 'none',
    });
  },
});
