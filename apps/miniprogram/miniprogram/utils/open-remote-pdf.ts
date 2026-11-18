import { RequestError } from '../types/api';

/** 下载远程 PDF 并用系统文档预览打开 */
export function openRemotePdf(url: string): Promise<void> {
  const pdfUrl = String(url || '').trim();
  if (!pdfUrl) {
    return Promise.reject(new RequestError('暂无 PDF 文件'));
  }

  wx.showLoading({ title: '打开中', mask: true });
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: pdfUrl,
      success(res) {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          wx.hideLoading();
          reject(new RequestError('PDF 下载失败'));
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'pdf',
          showMenu: true,
          success() {
            wx.hideLoading();
            resolve();
          },
          fail(err) {
            wx.hideLoading();
            reject(new RequestError(err.errMsg || '无法打开 PDF'));
          },
        });
      },
      fail(err) {
        wx.hideLoading();
        reject(new RequestError(err.errMsg || 'PDF 下载失败'));
      },
    });
  });
}
