import { getOpenPositions, type OpenPositionSummaryView } from '../../../services/kb-life.service';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../utils/friendly-page-error';

Page({
  data: {
    positions: [] as OpenPositionSummaryView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
  },

  navLocked: false,

  onLoad() {
    void this.loadPositions();
  },

  onShow() {
    this.navLocked = true;
    setTimeout(() => {
      this.navLocked = false;
    }, 400);
  },

  async loadPositions() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const positions = await getOpenPositions();
      this.setData({
        positions,
        pageStatus: positions.length ? 'success' : 'empty',
      });
    } catch (error) {
      logPageLoadIssue('open-positions', error);
      this.setData(friendlyUnavailablePageData());
    }
  },

  onJobTap(event: WechatMiniprogram.TouchEvent) {
    if (this.navLocked) {
      return;
    }
    const { jobId } = event.currentTarget.dataset as { jobId?: string };
    if (!jobId) {
      return;
    }
    wx.navigateTo({
      url: `/subpackages/kb-life/open-positions/detail?id=${encodeURIComponent(jobId)}`,
    });
  },
});
