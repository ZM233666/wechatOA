import {
  HANDBOOK_CHAPTERS,
  HANDBOOK_INTRO_CN,
  HANDBOOK_INTRO_EN,
} from '../../../mock/handbook';

Page({
  data: {
    introCn: HANDBOOK_INTRO_CN,
    introEn: HANDBOOK_INTRO_EN,
    chapters: HANDBOOK_CHAPTERS,
  },

  onDownload() {
    wx.showToast({
      title: 'PDF 下载功能开发中',
      icon: 'none',
    });
  },

  onChapterTap() {
    wx.showToast({
      title: '章节内容开发中',
      icon: 'none',
    });
  },
});
