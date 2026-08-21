import {
  getProfile,
  getStoredProfileRole,
  setStoredProfileRole,
  type ProfileRoleKey,
  type ProfileRoleOption,
  type ProfileUser,
} from '../../../services/profile.service';
import { RequestError } from '../../../types/api';

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
    void this.loadRole(getStoredProfileRole());
  },

  async loadRole(roleKey: ProfileRoleKey) {
    this.setData({ pageStatus: 'loading', currentRole: roleKey });
    try {
      const result = await getProfile(roleKey);
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
    const roleKey = setStoredProfileRole(key);
    void this.loadRole(roleKey);
  },
});
