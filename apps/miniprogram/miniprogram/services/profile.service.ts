import { getCurrentEnvVersion } from '../config/env';
import type { ImageResource } from '../types/content';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export type ProfileRoleKey = 'Edward' | 'Customer' | 'Visitor';

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

export async function getProfile(loggedIn = false, selectedKey: ProfileRoleKey = 'Visitor') {
  const query =
    getCurrentEnvVersion() === 'develop' && loggedIn ? { loggedIn: 'true' } : undefined;
  const data = await get<ProfileDto>(API_ENDPOINTS.profile, query);
  return mapProfile(data, selectedKey);
}
