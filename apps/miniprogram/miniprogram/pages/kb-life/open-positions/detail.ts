import { getOpenPositionById, type OpenPosition } from '../../../mock/open-positions';

Page({
  data: {
    job: null as OpenPosition | null,
  },

  onLoad(query: Record<string, string | undefined>) {
    const job = getOpenPositionById(query.id ?? '');
    this.setData({
      job: job ?? null,
    });
  },

  onApply() {
    wx.showToast({
      title: '简历投递页面开发中',
      icon: 'none',
    });
  },
});
