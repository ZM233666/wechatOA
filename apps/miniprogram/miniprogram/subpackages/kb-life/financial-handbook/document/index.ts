import {
  getFinancialGuidanceHandbook,
  type FinancialGuidanceSectionId,
} from '../../../../services/kb-life.service';
import { RequestError } from '../../../../types/api';

const NAV_TITLE: Record<FinancialGuidanceSectionId, string> = {
  notes: 'Fin Notes',
  manual: 'Fin Manual',
};

Page({
  data: {
    navTitle: 'Fin Handbook',
    sectionId: '' as FinancialGuidanceSectionId | '',
    title: '',
    subtitle: '',
    edition: '',
    introCn: '',
    introEn: '',
    pdfUrl: '',
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
    downloading: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const section = query.section;
    if (section !== 'notes' && section !== 'manual') {
      this.setData({
        pageStatus: 'error',
        errorText: '无效的文档类型',
      });
      return;
    }
    this.setData({
      sectionId: section,
      navTitle: NAV_TITLE[section],
    });
    void this.loadSection(section);
  },

  async loadSection(sectionId: FinancialGuidanceSectionId) {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const handbook = await getFinancialGuidanceHandbook();
      const section = handbook.sections.find((item) => item.id === sectionId);
      if (!section) {
        this.setData({
          pageStatus: 'error',
          errorText: '未找到该文档',
        });
        return;
      }
      this.setData({
        title: section.title,
        subtitle: section.subtitle,
        edition: handbook.edition,
        introCn: section.introCn,
        introEn: section.introEn,
        pdfUrl: section.pdfUrl,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '文档加载失败',
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
