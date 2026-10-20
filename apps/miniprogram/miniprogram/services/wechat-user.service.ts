import { getCurrentEnvVersion } from '../config/env';
import { IMAGE_FALLBACK } from '../utils/format';

/** 本地缓存的微信头像（wx.getUserInfo / 登录接口 / chooseAvatar 写入） */
export const WECHAT_USER_AVATAR_STORAGE_KEY = 'wechatUserAvatarUrl';

export function getWeChatAvatarFromStorage(): string {
  try {
    return String(wx.getStorageSync(WECHAT_USER_AVATAR_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function setWeChatAvatarUrl(url: string): void {
  const value = url.trim();
  if (!value) {
    clearWeChatAvatarUrl();
    return;
  }
  try {
    wx.setStorageSync(WECHAT_USER_AVATAR_STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

export function clearWeChatAvatarUrl(): void {
  try {
    wx.removeStorageSync(WECHAT_USER_AVATAR_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isRemoteAvatarUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * 展示用头像：正式环境优先微信头像（本地缓存或后端 HTTPS）；
 * 开发环境在无微信头像时仍可用 Mock 本地路径便于联调。
 */
export function pickUserDisplayAvatar(profileAvatarUrl: string, weChatAvatarUrl?: string): string {
  const wechat = (weChatAvatarUrl ?? getWeChatAvatarFromStorage()).trim();
  if (isRemoteAvatarUrl(wechat)) {
    return wechat;
  }
  const profile = profileAvatarUrl.trim();
  if (isRemoteAvatarUrl(profile)) {
    return profile;
  }
  if (getCurrentEnvVersion() === 'develop' && profile) {
    return profile;
  }
  return wechat || profile || IMAGE_FALLBACK;
}

/**
 * 若用户曾授权「用户信息」，同步微信头像到本地缓存。
 * 正式环境绑定登录后应由后端返回 avatar，或在此扩展 wx.login + 后端换 openid 头像。
 */
export async function trySyncWeChatAvatarFromAuth(): Promise<string> {
  const cached = getWeChatAvatarFromStorage();
  if (cached && isRemoteAvatarUrl(cached)) {
    return cached;
  }
  try {
    const { authSetting } = await wx.getSetting();
    if (!authSetting['scope.userInfo']) {
      return cached;
    }
    const res = await wx.getUserInfo({ lang: 'zh_CN' });
    const url = res.userInfo?.avatarUrl?.trim() ?? '';
    if (url) {
      setWeChatAvatarUrl(url);
      return url;
    }
  } catch {
    // 未授权或基础库限制时静默失败
  }
  return cached;
}

/** 登录 / 身份绑定成功后由后端下发的微信头像 URL */
export function applyWeChatAvatarFromLogin(avatarUrl?: string | null): void {
  const url = (avatarUrl ?? '').trim();
  if (url) {
    setWeChatAvatarUrl(url);
  }
}
