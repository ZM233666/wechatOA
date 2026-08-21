import { getInsightReports, type InsightCover } from '../../../services/services.service';
import { RequestError } from '../../../types/api';
import { openInsightAccessDenied, shouldBlockInsightForVisitor } from '../../../utils/insights';

Page({
  data: {
    items: [] as InsightCover[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    readerVisible: false,
    readerReportId: '',
    shareTitle: 'KB Insights',
  },

  onLoad() {
    void this.loadInsights();
  },

  onShareAppMessage() {
    return {
      title: this.data.shareTitle || 'KB Insights',
      path: '/pages/services/insights/index',
    };
  },

  async loadInsights() {
    this.setData({ pageStatus: 'loading' });
    try {
      const items = await getInsightReports();
      this.setData({
        items,
        pageStatus: items.length ? 'success' : 'empty',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '洞察列表加载失败',
      });
    }
  },

  onInsightTap(event: WechatMiniprogram.TouchEvent) {
    const { id, gating } = event.currentTarget.dataset as { id?: string; gating?: boolean | string };
    if (!id) {
      return;
    }
    const isGated = gating === true || gating === 'true';
    if (shouldBlockInsightForVisitor(isGated)) {
      openInsightAccessDenied(id);
      return;
    }
    this.setData({
      readerVisible: true,
      readerReportId: id,
    });
  },

  onReaderClose() {
    this.setData({
      readerVisible: false,
      readerReportId: '',
    });
  },
});
