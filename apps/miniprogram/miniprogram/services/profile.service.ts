import { getCurrentEnvVersion } from '../config/env';
import type { ImageResource } from '../types/content';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export type ProfileRoleKey = 'Edward' | 'Customer' | 'Visitor';

export const PROFILE_ROLE_STORAGE_KEY = 'profileRoleKey';

export interface ProfileUser {
  chineseName: string;
  name: string;
  titleCn: string;
  titleEn: string;
  department: string;
  role: string;
  avatar: string;
}

export interface ProfileField {
  id: string;
  labelCn: string;
  labelEn: string;
  value: string;
  icon: string;
}

export interface ProfileRoleOption {
  key: ProfileRoleKey;
  label: string;
  selected: boolean;
}

interface ProfileDto {
  isLoggedIn: boolean;
  user: {
    chineseName: string;
    name: string;
    titleCn: string;
    titleEn: string;
    department: string;
    role: string;
    avatar: ImageResource;
  } | null;
  fields: Array<{
    id: string;
    labelCn: string;
    labelEn: string;
    value: string;
    icon: ImageResource;
  }>;
  roleOptions: Array<{ key: ProfileRoleKey; label: string }>;
}

const emptyUser: ProfileUser = {
  chineseName: '访客',
  name: 'Guest',
  titleCn: '未登录',
  titleEn: 'Guest',
  department: 'External',
  role: 'Visitor',
  avatar: '',
};

export function resolveProfileRoleKey(value: unknown): ProfileRoleKey {
  if (value === 'Customer' || value === 'Visitor' || value === 'Edward') {
    return value;
  }
  return 'Visitor';
}

export function getStoredProfileRole(): ProfileRoleKey {
  try {
    return resolveProfileRoleKey(wx.getStorageSync(PROFILE_ROLE_STORAGE_KEY));
  } catch {
    return 'Visitor';
  }
}

export function setStoredProfileRole(roleKey: ProfileRoleKey): ProfileRoleKey {
  const resolved = resolveProfileRoleKey(roleKey);
  try {
    wx.setStorageSync(PROFILE_ROLE_STORAGE_KEY, resolved);
  } catch {
    // ignore storage write errors; caller still uses resolved key this session
  }
  return resolved;
}

function mapProfile(data: ProfileDto, selectedKey: ProfileRoleKey): {
  user: ProfileUser;
  fields: ProfileField[];
  roles: ProfileRoleOption[];
  isLoggedIn: boolean;
} {
  return {
    isLoggedIn: data.isLoggedIn,
    user: data.user
      ? {
          chineseName: data.user.chineseName,
          name: data.user.name,
          titleCn: data.user.titleCn,
          titleEn: data.user.titleEn,
          department: data.user.department,
          role: data.user.role,
          avatar: toAssetUrl(data.user.avatar),
        }
      : emptyUser,
    fields: data.fields.map((item) => ({
      id: item.id,
      labelCn: item.labelCn,
      labelEn: item.labelEn,
      value: item.value,
      icon: toAssetUrl(item.icon),
    })),
    roles: data.roleOptions.map((item) => ({
      ...item,
      selected: item.key === selectedKey,
    })),
  };
}

export async function getProfile(selectedKey: ProfileRoleKey = getStoredProfileRole()) {
  const query =
    getCurrentEnvVersion() === 'develop'
      ? {
          role: selectedKey,
          ...(selectedKey !== 'Visitor' ? { loggedIn: 'true' } : {}),
        }
      : undefined;
  const data = await get<ProfileDto>(API_ENDPOINTS.profile, query);
  return mapProfile(data, selectedKey);
}
