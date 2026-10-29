Page({
  data: {
    title: 'KB Insights',
  },

  onLoad(query: Record<string, string | undefined>) {
    const id = query.id ?? '';
    if (id) {
      this.setData({ title: 'Insight Report' });
    }
  },

  onGoIdentityBinding() {
    wx.switchTab({ url: '/pages/profile/index' });
  },
});
