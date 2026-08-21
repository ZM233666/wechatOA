import {
  getProfile,
  getStoredProfileRole,
  type ProfileField,
  type ProfileUser,
} from '../../services/profile.service';
import { RequestError } from '../../types/api';

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
    fields: [] as ProfileField[],
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  onShow() {
    void this.loadProfile();
  },

  async loadProfile() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getProfile(getStoredProfileRole());
      this.setData({
        user: result.user,
        fields: result.fields,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '个人中心加载失败',
      });
    }
  },

  onProfileTap() {
    wx.navigateTo({
      url: '/pages/profile/personal-info/index',
    });
  },
});
