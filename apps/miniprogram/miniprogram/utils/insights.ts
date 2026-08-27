import { getInsightReport } from '../services/services.service';
import { getStoredProfileRole } from '../services/profile.service';
import { RequestError } from '../types/api';

export function shouldBlockInsightForVisitor(gating = false): boolean {
  return gating && getStoredProfileRole() === 'Visitor';
}

/** 打开独立权限页；Visitor + gating 使用 */
export function openInsightAccessDenied(id: string): void {
  wx.navigateTo({
    url: `/pages/services/insights/access-denied/index?id=${encodeURIComponent(id)}`,
  });
}

/**
 * 打开 Insight：统一进入小程序内翻页阅读器。
 * PDF 源由 mock 在打开时即时渲成 sheet 页（与 mock 报告共用同一阅读器）。
 */
export async function openInsightContent(options: {
  id: string;
  gating?: boolean;
  onOpenReader: (id: string) => void;
}): Promise<void> {
  const { id, gating = false, onOpenReader } = options;
  if (shouldBlockInsightForVisitor(gating)) {
    openInsightAccessDenied(id);
    return;
  }

  wx.showLoading({ title: '打开中', mask: true });
  try {
    const report = await getInsightReport(id);
    if (!report.pages.length) {
      wx.showToast({ title: '暂无内容', icon: 'none' });
      return;
    }
    onOpenReader(id);
  } catch (error) {
    wx.showToast({
      title: error instanceof RequestError ? error.message : '打开失败',
      icon: 'none',
    });
  } finally {
    wx.hideLoading();
  }
}
