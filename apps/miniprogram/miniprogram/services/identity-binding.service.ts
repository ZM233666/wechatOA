import { API_ENDPOINTS } from './endpoints';
import {
  ensureMiniSession,
  getSessionLoginCode,
  loginMiniSession,
} from './identity-login.service';
import { get, post } from './request';
import { RequestError } from '../types/api';
import { getApiEnvironment } from '../config/env';
import { getTempBindToken } from './auth-session';

export type IdentityBindingRecord = {
  companyEmail: string;
  boundAt: string;
  displayName: string;
  department: string;
  roleLabel: string;
};

type IdentityBindingInfo = IdentityBindingRecord;

type IdentityBindingStatus = {
  bound: boolean;
  binding: IdentityBindingInfo | null;
};

type MiniSessionMe = {
  email: string;
  identityType: string;
  company: { name?: string } | null;
  boundAt: string;
  displayName: string;
  department: string;
  roleLabel: string;
};

const STORAGE_KEY = 'identityBindingRecord';

export function getStoredIdentityBinding(): IdentityBindingRecord | null {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const record = raw as Partial<IdentityBindingRecord>;
    const email = String(record.companyEmail ?? '').trim();
    if (!email) {
      return null;
    }
    return {
      companyEmail: email,
      boundAt: String(record.boundAt ?? ''),
      displayName: String(record.displayName ?? ''),
      department: String(record.department ?? ''),
      roleLabel: String(record.roleLabel ?? ''),
    };
  } catch {
    return null;
  }
}

export function saveIdentityBinding(record: IdentityBindingRecord): void {
  try {
    wx.setStorageSync(STORAGE_KEY, record);
  } catch {
    // ignore
  }
}

export function clearIdentityBinding(): void {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function mapBindingInfoToRecord(info: IdentityBindingInfo): IdentityBindingRecord {
  return {
    companyEmail: info.companyEmail,
    boundAt: info.boundAt,
    displayName: info.displayName,
    department: info.department,
    roleLabel: info.roleLabel,
  };
}

/** Mock 兼容参数；真实后端统一使用 Authorization Bearer。 */
export async function getLoginCodeQueryParams(): Promise<{ loginCode: string } | Record<string, never>> {
  if (getApiEnvironment().dataSource === 'real-server') {
    return {};
  }
  try {
    const loginCode = await getSessionLoginCode();
    return loginCode ? { loginCode } : {};
  } catch {
    return {};
  }
}

/** @deprecated 请使用 getSessionLoginCode，保证与会话身份同步共用同一 code */
export function getWeChatLoginCode(): Promise<string> {
  return getSessionLoginCode();
}

/** 从服务端拉取绑定状态；真实后端以 Mini JWT 查询 session/me。 */
export async function fetchIdentityBindingFromServer(): Promise<IdentityBindingRecord | null> {
  if (getApiEnvironment().dataSource === 'real-server') {
    const authenticated = await ensureMiniSession();
    if (!authenticated) {
      clearIdentityBinding();
      return null;
    }
    const session = await get<MiniSessionMe>(API_ENDPOINTS.miniappSessionMe);
    if (!session.email) {
      clearIdentityBinding();
      return null;
    }
    const record: IdentityBindingRecord = {
      companyEmail: session.email,
      boundAt: session.boundAt,
      displayName: session.displayName,
      department: session.department || session.company?.name || '',
      roleLabel: session.roleLabel || session.identityType,
    };
    saveIdentityBinding(record);
    return record;
  }
  const loginCode = await getSessionLoginCode();
  const status = await get<IdentityBindingStatus>(API_ENDPOINTS.profileIdentityBinding, {
    loginCode,
  });
  if (!status.bound || !status.binding) {
    clearIdentityBinding();
    return null;
  }
  const record = mapBindingInfoToRecord(status.binding);
  saveIdentityBinding(record);
  return record;
}

/**
 * 提交公司邮箱绑定：后端校验完整邮箱或域名后缀，成功后将 openid 与邮箱关联。
 */
export async function previewIdentity(companyEmail: string): Promise<{
  email: string;
  identityType: string;
  company: Record<string, unknown> | null;
}> {
  return post(API_ENDPOINTS.authIdentityPreview, { email: companyEmail.trim() });
}

export async function sendIdentityEmailCode(companyEmail: string): Promise<{
  expires_in: number;
}> {
  return post(API_ENDPOINTS.authEmailCode, {
    email: companyEmail.trim(),
    scene: 'BIND',
  });
}

export async function submitIdentityBinding(
  companyEmail: string,
  verificationCode?: string,
): Promise<IdentityBindingRecord> {
  const email = companyEmail.trim();
  if (getApiEnvironment().dataSource === 'real-server') {
    await previewIdentity(email);
    const code = verificationCode?.trim();
    if (!code) {
      await sendIdentityEmailCode(email);
      throw new RequestError(
        '验证码已发送，请输入邮箱验证码后完成绑定',
        undefined,
        undefined,
        'CODE_REQUIRED',
      );
    }
    const tempToken = getTempBindToken();
    if (!tempToken) {
      await loginMiniSession();
    }
    const currentTempToken = getTempBindToken();
    if (!currentTempToken) {
      throw new RequestError('绑定会话已失效，请重试', undefined, undefined, 'UNAUTHORIZED');
    }
    await post(API_ENDPOINTS.authBind, { email, code }, {
      Authorization: `Bearer ${currentTempToken}`,
    });
    await loginMiniSession();
    const record = await fetchIdentityBindingFromServer();
    if (!record) {
      throw new RequestError('绑定成功，但登录会话刷新失败，请重试');
    }
    return record;
  }
  const loginCode = await getSessionLoginCode();
  const result = await post<{ bound: boolean; binding: IdentityBindingInfo }>(
    API_ENDPOINTS.profileIdentityBinding,
    {
      companyEmail: email,
      loginCode,
    },
  );
  if (!result.bound || !result.binding) {
    throw new RequestError('绑定失败，请稍后重试');
  }
  const record = mapBindingInfoToRecord(result.binding);
  saveIdentityBinding(record);
  return record;
}
