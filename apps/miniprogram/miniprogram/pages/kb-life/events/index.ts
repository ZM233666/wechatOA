import { COMPANY_EVENT_ITEMS } from '../../../mock/events';

Page({
  data: {
    events: COMPANY_EVENT_ITEMS,
  },

  onEventTap(event: WechatMiniprogram.TouchEvent) {
    const { path } = event.currentTarget.dataset as { path?: string };
    if (!path) {
      return;
    }
    wx.navigateTo({ url: path });
  },
});
