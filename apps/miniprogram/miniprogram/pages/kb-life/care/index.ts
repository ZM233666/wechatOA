import { CARE_HERO, CARE_INITIATIVES } from '../../../mock/care';

Page({
  data: {
    hero: CARE_HERO,
    initiatives: CARE_INITIATIVES,
  },

  onReadMore() {
    wx.showToast({
      title: '详情页面开发中',
      icon: 'none',
    });
  },
});
