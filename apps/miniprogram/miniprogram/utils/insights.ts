import { getStoredProfileRole } from '../services/profile.service';

export function shouldBlockInsightForVisitor(gating = false): boolean {
  return gating && getStoredProfileRole() === 'Visitor';
}

/** 打开独立权限页；Visitor + gating 使用 */
export function openInsightAccessDenied(id: string): void {
  wx.navigateTo({
    url: `/pages/services/insights/access-denied/index?id=${encodeURIComponent(id)}`,
  });
}
