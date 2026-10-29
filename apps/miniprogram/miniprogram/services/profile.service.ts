import type { ImageResource } from '../types/content';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { getSessionLoginCode } from './identity-login.service';
import { get, withRequestCache } from './request';
import {
  getWeChatAvatarFromStorage,
  pickUserDisplayAvatar,
  trySyncWeChatAvatarFromAuth,
} from './wechat-user.service';

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

function mapProfile(data: ProfileDto): {
  user: ProfileUser;
  fields: ProfileField[];
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
          avatar: pickUserDisplayAvatar(
            toAssetUrl(data.user.avatar),
            getWeChatAvatarFromStorage(),
          ),
        }
      : {
          ...emptyUser,
          avatar: pickUserDisplayAvatar('', getWeChatAvatarFromStorage()),
        },
    fields: data.fields.map((item) => ({
      id: item.id,
      labelCn: item.labelCn,
      labelEn: item.labelEn,
      value: item.value,
      icon: toAssetUrl(item.icon),
    })),
  };
}

/** 拉取个人资料；服务端按 wx.login code 关联身份绑定（Mock/Django 同一约定） */
export async function getProfile() {
  await trySyncWeChatAvatarFromAuth();
  let loginCode = '';
  try {
    loginCode = await getSessionLoginCode();
  } catch {
    // 无 code 时仍拉访客资料
  }
  return withRequestCache(`profile:${loginCode || 'guest'}`, 60_000, async () => {
    const query = loginCode ? { loginCode } : undefined;
    const data = await get<ProfileDto>(API_ENDPOINTS.profile, query);
    return mapProfile(data);
  });
}
