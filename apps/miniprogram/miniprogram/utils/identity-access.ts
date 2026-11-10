/**
 * 功能门禁只读本地绑定快照（`identityBindingRecord`），由 App.onLaunch 调用
 * `syncIdentitySession()` 与服务器对齐一次；点击 My Dashboard / 园区服务 / Insights 等
 * 不再重复请求身份接口，仅做同步 tier 判断。
 */
import { isIdentityGuardBypassEnabled } from '../config/env';
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
  if (isIdentityGuardBypassEnabled()) {
    return 'employee';
  }
  return resolveIdentityAccessTier(getStoredIdentityBinding());
}

export function isIdentityBound(): boolean {
  if (isIdentityGuardBypassEnabled()) {
    return true;
  }
  return getIdentityAccessTier() !== 'visitor';
}

export function isEmployeeIdentity(): boolean {
  if (isIdentityGuardBypassEnabled()) {
    return true;
  }
  return getIdentityAccessTier() === 'employee';
}

/** 园区地图 / 班车 / 食堂 / 假期日历：仅已绑定身份（员工或客户）可访问 */
export function shouldBlockCampusServicesForUnbound(): boolean {
  if (isIdentityGuardBypassEnabled()) {
    return false;
  }
  return !isIdentityBound();
}

/** WeTalk：仅 Employee 身份可访问 */
export function shouldBlockWetalkForNonEmployee(): boolean {
  if (isIdentityGuardBypassEnabled()) {
    return false;
  }
  return !isEmployeeIdentity();
}

/** 指导文件（列表 / 员工手册 / 财务指导手册）：访客与所有身份均可访问 */
export function shouldBlockGuidanceDocumentsForNonEmployee(): boolean {
  return false;
}

/** KB Insights（gating）：未绑定身份不可访问 */
export function shouldBlockGatedInsightForUnbound(gating = false): boolean {
  if (isIdentityGuardBypassEnabled()) {
    return false;
  }
  return gating && !isIdentityBound();
}

/** Setting Tab 打开「身份绑定」视图的一次性标记 */
export const PROFILE_OPEN_IDENTITY_BINDING_KEY = 'profileOpenIdentityBinding';

export type AccessDeniedKind = 'unbound' | 'employee';

export function buildAccessDeniedUrl(options?: {
  kind?: AccessDeniedKind;
  title?: string;
}): string {
  const kind = options?.kind === 'employee' ? 'employee' : 'unbound';
  const title = (options?.title || '').trim();
  const query = [`kind=${kind}`];
  if (title) {
    query.push(`title=${encodeURIComponent(title)}`);
  }
  return `/pages/access-denied/index?${query.join('&')}`;
}

/** 跳转通用无权限提示页（含「前往身份绑定」按钮） */
export function openAccessDeniedPage(options?: {
  kind?: AccessDeniedKind;
  title?: string;
  /** 默认 redirectTo，避免返回键回到无权限内容页 */
  mode?: 'navigate' | 'redirect';
}): void {
  const url = buildAccessDeniedUrl(options);
  if (options?.mode === 'navigate') {
    wx.navigateTo({
      url,
      fail: () => wx.redirectTo({ url }),
    });
    return;
  }
  wx.redirectTo({
    url,
    fail: () =>
      wx.navigateTo({
        url,
        fail: () => wx.switchTab({ url: '/pages/profile/index' }),
      }),
  });
}

/** 打开 Setting Tab 并进入身份绑定页 */
export function openIdentityBindingInProfile(): void {
  try {
    wx.setStorageSync(PROFILE_OPEN_IDENTITY_BINDING_KEY, '1');
  } catch {
    // ignore storage failures; still switch to Setting
  }
  wx.switchTab({ url: '/pages/profile/index' });
}

/** My Dashboard、园区服务等：未绑定身份不可访问 */
export function shouldBlockMyDashboardForUnbound(): boolean {
  if (isIdentityGuardBypassEnabled()) {
    return false;
  }
  return !isIdentityBound();
}

/** 独立子页入口拦截（My Dashboard / Employee Care 等） */
export function rejectUnboundIdentityAccess(
  _fallbackTab = '/pages/services/index',
  title = '',
): boolean {
  if (!shouldBlockMyDashboardForUnbound()) {
    return false;
  }
  openAccessDeniedPage({ kind: 'unbound', title });
  return true;
}

function rejectWhenEmployeeGated(shouldBlock: () => boolean, title = ''): boolean {
  if (!shouldBlock()) {
    return false;
  }
  openAccessDeniedPage({ kind: 'employee', title });
  return true;
}

/** WeTalk / 仍要求 Employee 的子页入口拦截 */
export function rejectEmployeeOnlyAccess(title = 'WeTalk'): boolean {
  return rejectWhenEmployeeGated(shouldBlockWetalkForNonEmployee, title);
}

/** 指导文件相关页入口拦截（develop 不拦截访客） */
export function rejectGuidanceDocumentsAccess(): boolean {
  return rejectWhenEmployeeGated(shouldBlockGuidanceDocumentsForNonEmployee);
}
