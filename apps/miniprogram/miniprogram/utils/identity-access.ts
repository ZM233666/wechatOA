/**
 * 功能门禁只读本地绑定快照（`identityBindingRecord`），由 App.onLaunch 调用
 * `syncIdentitySession()` 与服务器对齐一次；点击 My Dashboard / 园区服务 / Insights 等
 * 不再重复请求身份接口，仅做同步 tier 判断。
 */
import { isIdentityGuardBypassEnabled } from '../config/env';
import type { IdentityBindingRecord } from '../services/identity-binding.service';
import { getStoredIdentityBinding } from '../services/identity-binding.service';
import { RequestError } from '../types/api';

export type IdentityAccessTier = 'visitor' | 'customer' | 'employee';

function normalizeRoleLabel(label: string): string {
  return label.trim().toLowerCase();
}

/** 内部员工：中英文角色名都视为 employee，从而开放全部信息页 */
function isEmployeeRoleLabel(label: string): boolean {
  const role = normalizeRoleLabel(label);
  if (!role) {
    return false;
  }
  if (
    role === 'employee' ||
    role === 'internal' ||
    role === 'staff' ||
    role === 'kb-employee' ||
    role === 'kb_employee' ||
    role === '内部' ||
    role === '内部员工' ||
    role === '员工'
  ) {
    return true;
  }
  return role.includes('employee') || role.includes('内部员工') || role.includes('内部');
}

/** 由绑定记录推导内外部身份（启动同步后各页只读本地，不再逐功能请求后端） */
export function resolveIdentityAccessTier(
  binding: IdentityBindingRecord | null,
): IdentityAccessTier {
  if (!binding) {
    return 'visitor';
  }
  const role = normalizeRoleLabel(binding.roleLabel);
  if (isEmployeeRoleLabel(role)) {
    return 'employee';
  }
  if (role === 'customer' || role === '客户' || role.includes('customer')) {
    return 'customer';
  }
  return 'visitor';
}

/** 未识别 roleLabel 时不做员工/客户细分，但仍可能已绑定 */
export function getIdentityAccessTier(): IdentityAccessTier {
  if (isIdentityGuardBypassEnabled()) {
    return 'employee';
  }
  return resolveIdentityAccessTier(getStoredIdentityBinding());
}

/**
 * 是否已完成企业身份绑定（仅读本地快照，不受 develop 门禁绕过影响）。
 * 有绑定记录即视为已绑定，与 Setting 页一致，不因 roleLabel 未识别而再引导绑定。
 */
export function hasStoredIdentityBinding(): boolean {
  return getStoredIdentityBinding() !== null;
}

export function isIdentityBound(): boolean {
  if (isIdentityGuardBypassEnabled()) {
    return true;
  }
  return hasStoredIdentityBinding();
}

export function isEmployeeIdentity(): boolean {
  if (isIdentityGuardBypassEnabled()) {
    return true;
  }
  return getIdentityAccessTier() === 'employee';
}

/** 园区地图 / 班车 / 食堂 / 假期日历：仅已绑定身份（员工或客户）可访问；内部员工始终可访问 */
export function shouldBlockCampusServicesForUnbound(): boolean {
  if (isIdentityGuardBypassEnabled() || isEmployeeIdentity()) {
    return false;
  }
  return !isIdentityBound();
}

/** WeTalk：仅 Employee 身份可访问；内部员工始终可访问 */
export function shouldBlockWetalkForNonEmployee(): boolean {
  if (isIdentityGuardBypassEnabled() || isEmployeeIdentity()) {
    return false;
  }
  return true;
}

/** 指导文件（列表 / 员工手册 / 财务指导手册）：访客与所有身份均可访问 */
export function shouldBlockGuidanceDocumentsForNonEmployee(): boolean {
  return false;
}

/** KB Insights（gating）：未绑定身份不可访问；内部员工始终可访问 */
export function shouldBlockGatedInsightForUnbound(gating = false): boolean {
  if (isIdentityGuardBypassEnabled() || isEmployeeIdentity()) {
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

/** My Dashboard、园区服务等：未绑定身份不可访问；内部员工始终可访问 */
export function shouldBlockMyDashboardForUnbound(): boolean {
  if (isIdentityGuardBypassEnabled() || isEmployeeIdentity()) {
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

const IDENTITY_AUTH_CODES = new Set([
  '4000',
  '401',
  'UNAUTHORIZED',
  'TOKEN_EXPIRED',
  'not_authenticated',
]);

/** Django / DRF 未带身份：code 4000 或「身份认证信息未提供」 */
export function isIdentityAuthError(error: unknown): boolean {
  if (!(error instanceof RequestError)) {
    return false;
  }
  if (error.statusCode === 401) {
    return true;
  }
  if (error.code && IDENTITY_AUTH_CODES.has(error.code)) {
    return true;
  }
  return /身份认证|认证信息未提供|未登录/.test(error.message);
}

/**
 * 身份校验失败时进入统一无权限页。
 * 已绑定只说明无权限；未绑定才引导去绑定。
 */
export function handleIdentityAccessFailure(
  error: unknown,
  options?: { kind?: AccessDeniedKind; title?: string },
): boolean {
  if (!isIdentityAuthError(error) || isEmployeeIdentity()) {
    return false;
  }
  openAccessDeniedPage({
    kind: options?.kind ?? 'unbound',
    title: options?.title ?? '',
    mode: 'redirect',
  });
  return true;
}

/** 与园区服务、My Dashboard 相同：进入通用无权限页 */
export function openIdentityBindingGuide(title = ''): void {
  openAccessDeniedPage({ kind: 'unbound', title });
}
