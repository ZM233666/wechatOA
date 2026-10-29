import { getCompanyActivities } from '../../../../services/kb-life.service';
import { RequestError } from '../../../../types/api';

Page({
  data: {
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    downloading: false,
    event: {
      title: '',
      subtitle: '',
      pdfUrl: '',
      pdfFileName: '',
      images: [] as string[],
    },
  },

  onLoad() {
    void this.loadDetail();
  },

  async loadDetail() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const result = await getCompanyActivities();
      if (!result.health) {
        this.setData({ pageStatus: 'empty' });
        return;
      }
      this.setData({
        event: result.health,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '健康体检加载失败',
      });
    }
  },

  onDownloadPdf() {
    const pdfUrl = this.data.event.pdfUrl.trim();
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
