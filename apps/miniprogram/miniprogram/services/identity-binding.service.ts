import { API_ENDPOINTS } from './endpoints';
import { getSessionLoginCode } from './identity-login.service';
import { get, post } from './request';
import { RequestError } from '../types/api';

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

/** 受保护 Mini API 查询参数：复用启动时会话 loginCode，避免每次请求 wx.login */
export async function getLoginCodeQueryParams(): Promise<{ loginCode: string } | Record<string, never>> {
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

/** 从服务端拉取当前微信 openid 的绑定状态（Mock/Django 同一契约） */
export async function fetchIdentityBindingFromServer(): Promise<IdentityBindingRecord | null> {
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
export async function submitIdentityBinding(companyEmail: string): Promise<IdentityBindingRecord> {
  const email = companyEmail.trim();
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
