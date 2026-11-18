import { getInsightReports, type InsightCover } from '../../../services/services.service';
import { RequestError } from '../../../types/api';
import { openInsightContent } from '../../../utils/insights';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../utils/friendly-page-error';

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
      path: '/subpackages/services/insights/index',
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
        pageStatus: 'empty',
        ...friendlyUnavailablePageData(),
      });
    }
  },

  onInsightTap(event: WechatMiniprogram.TouchEvent) {
    const { id, gating } = event.currentTarget.dataset as { id?: string; gating?: boolean | string };
    if (!id) {
      return;
    }
    const isGated = gating === true || gating === 'true';
    void openInsightContent({
      id,
      gating: isGated,
      onOpenReader: (reportId) => {
        this.setData({
          readerVisible: true,
          readerReportId: reportId,
        });
      },
    });
  },

  onReaderClose() {
    this.setData({
      readerVisible: false,
      readerReportId: '',
    });
  },
});
