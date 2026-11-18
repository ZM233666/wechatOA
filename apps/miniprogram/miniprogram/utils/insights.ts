import { openAccessDeniedPage, shouldBlockGatedInsightForUnbound } from './identity-access';

export function shouldBlockInsightForVisitor(gating = false): boolean {
  return shouldBlockGatedInsightForUnbound(gating);
}

/** 打开独立权限页；未绑定 + gating 使用 */
export function openInsightAccessDenied(_id: string): void {
  openAccessDeniedPage({ kind: 'unbound', title: 'KB Insights', mode: 'navigate' });
}

/**
 * 打开 Insight：统一进入小程序内翻页阅读器。
 * 点击后立即展示阅读器加载态，报告获取与空内容处理统一由阅读器负责。
 */
export function openInsightContent(options: {
  id: string;
  gating?: boolean;
  onOpenReader: (id: string) => void;
}): void {
  const { id, gating = false, onOpenReader } = options;
  if (shouldBlockInsightForVisitor(gating)) {
    openInsightAccessDenied(id);
    return;
  }
  onOpenReader(id);
}
