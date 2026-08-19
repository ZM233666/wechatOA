import { OPEN_POSITIONS } from '../../../mock/open-positions';

Page({
  data: {
    positions: OPEN_POSITIONS,
  },

  onJobTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/kb-life/open-positions/detail?id=${id}`,
    });
  },
});
