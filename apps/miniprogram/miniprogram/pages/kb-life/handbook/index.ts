import { getEmployeeHandbook } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';

Page({
  data: {
    title: '',
    edition: '',
    introCn: '',
    introEn: '',
    pdfUrl: '',
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
    downloading: false,
  },

  onLoad() {
    void this.loadHandbook();
  },

  async loadHandbook() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const result = await getEmployeeHandbook();
      this.setData({
        title: result.title,
        edition: result.edition,
        introCn: result.introCn,
        introEn: result.introEn,
        pdfUrl: result.pdfUrl,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '员工手册加载失败',
      });
    }
  },

  onDownload() {
    const pdfUrl = this.data.pdfUrl.trim();
    if (!pdfUrl || this.data.downloading) {
      if (!pdfUrl) {
        wx.showToast({ title: '暂无可下载的 PDF', icon: 'none' });
      }
      return;
    }
    this.setData({ downloading: true });
    wx.showLoading({ title: '正在下载…', mask: true });
    wx.downloadFile({
      url: pdfUrl,
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'pdf',
          showMenu: true,
          fail: () => {
            wx.showToast({ title: '无法打开 PDF', icon: 'none' });
          },
        });
      },
      fail: () => {
        wx.showToast({ title: '下载失败，请检查网络', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
        this.setData({ downloading: false });
      },
    });
  },
});
