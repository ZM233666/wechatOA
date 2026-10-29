Page({
  data: {
    reportId: '',
    readerVisible: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const id = query.id ?? '';
    this.setData({ reportId: id });
    if (!id) {
      return;
    }
    this.setData({ readerVisible: true, reportId: id });
  },

  onShareAppMessage() {
    return {
      title: 'KB Insights',
      path: `/pages/services/insights/reader?id=${this.data.reportId}`,
    };
  },

  onReaderClose() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/services/index' }),
    });
  },
});
