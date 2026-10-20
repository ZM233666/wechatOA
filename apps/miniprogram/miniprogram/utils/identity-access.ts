/**
 * 功能门禁只读本地绑定快照（`identityBindingRecord`），由 App.onLaunch 调用
 * `syncIdentitySession()` 与服务器对齐一次；点击 My Dashboard / 园区服务 / Insights 等
 * 不再重复请求身份接口，仅做同步 tier 判断。
 */
import type { IdentityBindingRecord } from '../services/identity-binding.service';
import { getStoredIdentityBinding } from '../services/identity-binding.service';

export type IdentityAccessTier = 'visitor' | 'customer' | 'employee';

function normalizeRoleLabel(label: string): string {
  return label.trim().toLowerCase();
}

/** 由绑定记录推导内外部身份（启动同步后各页只读本地，不再逐功能请求后端） */
export function resolveIdentityAccessTier(
  binding: IdentityBindingRecord | null,
): IdentityAccessTier {
  if (!binding) {
    return 'visitor';
  }
  const role = normalizeRoleLabel(binding.roleLabel);
  if (role === 'employee') {
    return 'employee';
  }
  if (role === 'customer') {
    return 'customer';
  }
  return 'visitor';
}

/** 未绑定或未知 roleLabel 视为访客 */
export function getIdentityAccessTier(): IdentityAccessTier {
  return resolveIdentityAccessTier(getStoredIdentityBinding());
}

export function isIdentityBound(): boolean {
  return getIdentityAccessTier() !== 'visitor';
}

export function isEmployeeIdentity(): boolean {
  return getIdentityAccessTier() === 'employee';
}

/** 园区地图 / 班车 / 食堂 / 假期日历：仅已绑定身份（员工或客户）可访问 */
export function shouldBlockCampusServicesForUnbound(): boolean {
  return !isIdentityBound();
}

/** WeTalk：仅 Employee 身份可访问 */
export function shouldBlockWetalkForNonEmployee(): boolean {
  return !isEmployeeIdentity();
}

/** 指导文件（列表 / 员工手册 / 财务指导手册）：访客与所有身份均可访问 */
export function shouldBlockGuidanceDocumentsForNonEmployee(): boolean {
  return false;
}

/** KB Insights（gating）：未绑定身份不可访问 */
export function shouldBlockGatedInsightForUnbound(gating = false): boolean {
  return gating && !isIdentityBound();
}

export function openIdentityBindingInProfile(): void {
  wx.switchTab({ url: '/pages/profile/index' });
}

/** My Dashboard、园区服务等：未绑定身份不可访问 */
export function shouldBlockMyDashboardForUnbound(): boolean {
  return !isIdentityBound();
}

/** 独立子页入口拦截（My Dashboard 等） */
export function rejectUnboundIdentityAccess(fallbackTab = '/pages/services/index'): boolean {
  if (!shouldBlockMyDashboardForUnbound()) {
    return false;
  }
  wx.showToast({ title: '请先完成身份绑定', icon: 'none' });
  setTimeout(() => {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: fallbackTab }),
    });
  }, 300);
  return true;
}

function rejectWhenEmployeeGated(shouldBlock: () => boolean): boolean {
  if (!shouldBlock()) {
    return false;
  }
  wx.showToast({ title: '请先绑定员工身份', icon: 'none' });
  setTimeout(() => {
    wx.navigateBack({
      fail: () => openIdentityBindingInProfile(),
    });
  }, 300);
  return true;
}

/** WeTalk / 仍要求 Employee 的子页入口拦截 */
export function rejectEmployeeOnlyAccess(): boolean {
  return rejectWhenEmployeeGated(shouldBlockWetalkForNonEmployee);
}

/** 指导文件相关页入口拦截（develop 不拦截访客） */
export function rejectGuidanceDocumentsAccess(): boolean {
  return rejectWhenEmployeeGated(shouldBlockGuidanceDocumentsForNonEmployee);
}
