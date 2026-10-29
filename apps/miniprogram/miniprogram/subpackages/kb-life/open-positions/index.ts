import { getOpenPositions, type OpenPositionSummaryView } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';

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
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '岗位列表加载失败',
      });
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
      url: `/pages/kb-life/open-positions/detail?id=${encodeURIComponent(jobId)}`,
    });
  },
});
