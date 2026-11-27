import type { ImageResource } from '../types/content';
import { getApiEnvironment } from '../config/env';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { getStoredIdentityBinding } from './identity-binding.service';
import { ensureMiniSession, getSessionLoginCode } from './identity-login.service';
import { get, withRequestCache } from './request';
import {
  getWeChatAvatarFromStorage,
  pickUserDisplayAvatar,
  trySyncWeChatAvatarFromAuth,
} from './wechat-user.service';

export interface ProfileUser {
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

interface MiniSessionProfileDto {
  email: string;
  identityType: string;
  company: { name?: string } | null;
  displayName: string;
  department: string;
  roleLabel: string;
}

const emptyUser: ProfileUser = {
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

/** 拉取个人资料；真实后端读 Mini JWT 会话，Mock 保留 loginCode 契约。 */
export async function getProfile() {
  await trySyncWeChatAvatarFromAuth();
  if (getApiEnvironment().dataSource === 'real-server') {
    const authenticated = await ensureMiniSession();
    if (!authenticated) {
      const stored = getStoredIdentityBinding();
      if (stored?.displayName || stored?.companyEmail) {
        return {
          user: {
            ...emptyUser,
            name: stored.displayName || stored.companyEmail,
            titleCn: stored.roleLabel,
            department: stored.department,
            role: '',
            avatar: pickUserDisplayAvatar('', getWeChatAvatarFromStorage()),
          },
          fields: [],
          isLoggedIn: true,
        };
      }
      return {
        user: {
          ...emptyUser,
          avatar: pickUserDisplayAvatar('', getWeChatAvatarFromStorage()),
        },
        fields: [],
        isLoggedIn: false,
      };
    }
    return withRequestCache('profile:mini-session:role-label', 60_000, async () => {
      const data = await get<MiniSessionProfileDto>(API_ENDPOINTS.miniappSessionMe);
      const department = data.department || data.company?.name || '';
      return {
        isLoggedIn: true,
        user: {
          name: data.displayName,
          titleCn: data.roleLabel || '',
          titleEn: '',
          department,
          role: data.identityType,
          avatar: pickUserDisplayAvatar('', getWeChatAvatarFromStorage()),
        },
        fields: [
          { id: 'email', labelCn: '邮箱', labelEn: 'Email', value: data.email, icon: '' },
          { id: 'department', labelCn: '部门', labelEn: 'Department', value: department, icon: '' },
          { id: 'identityType', labelCn: '身份', labelEn: 'Identity', value: data.identityType, icon: '' },
        ],
      };
    });
  }
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
