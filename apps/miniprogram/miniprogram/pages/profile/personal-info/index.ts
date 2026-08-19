import {
  getProfile,
  type ProfileRoleKey,
  type ProfileRoleOption,
  type ProfileUser,
} from '../../../services/profile.service';
import { RequestError } from '../../../types/api';

const ROLE_STORAGE_KEY = 'profileRoleKey';

function resolveRoleKey(value: unknown): ProfileRoleKey {
  if (value === 'Customer' || value === 'Visitor' || value === 'Edward') {
    return value;
  }
  return 'Visitor';
}

Page({
  data: {
    user: {
      chineseName: '',
      name: '',
      titleCn: '',
      titleEn: '',
      department: '',
      role: '',
      avatar: '',
    } as ProfileUser,
    roles: [] as ProfileRoleOption[],
    currentRole: 'Visitor' as ProfileRoleKey,
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  onShow() {
    const stored = resolveRoleKey(wx.getStorageSync(ROLE_STORAGE_KEY));
    void this.loadRole(stored);
  },

  async loadRole(roleKey: ProfileRoleKey) {
    this.setData({ pageStatus: 'loading', currentRole: roleKey });
    try {
      const loggedIn = roleKey !== 'Visitor';
      const result = await getProfile(loggedIn, roleKey);
      this.setData({
        user: result.user,
        roles: result.roles,
        currentRole: roleKey,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '个人信息加载失败',
      });
    }
  },

  onRoleTap(event: WechatMiniprogram.TouchEvent) {
    const { key } = event.currentTarget.dataset as { key?: ProfileRoleKey };
    if (key !== 'Edward' && key !== 'Customer' && key !== 'Visitor') {
      return;
    }
    try {
      wx.setStorageSync(ROLE_STORAGE_KEY, key);
    } catch {
      // ignore
    }
    void this.loadRole(key);
  },
});
