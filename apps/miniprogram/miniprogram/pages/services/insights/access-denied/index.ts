import { getInsightReport } from '../../../../services/services.service';

Page({
  data: {
    title: 'KB Insights',
    requesting: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const id = query.id ?? '';
    if (!id) {
      return;
    }
    void getInsightReport(id)
      .then((report) => {
        this.setData({ title: report.title });
      })
      .catch(() => {
        // keep default title
      });
  },

  onRequestAccess() {
    if (this.data.requesting) {
      return;
    }
    this.setData({ requesting: true });
    wx.showToast({
      title: 'Permission request sent to admin',
      icon: 'none',
    });
    setTimeout(() => {
      this.setData({ requesting: false });
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/services/index' }) });
    }, 1200);
  },
});
