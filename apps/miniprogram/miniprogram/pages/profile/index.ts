import {
  getStoredIdentityBinding,
  submitIdentityBinding,
  type IdentityBindingRecord,
} from '../../services/identity-binding.service';
import {
  applyIdentityBindingToSession,
  syncIdentitySession,
} from '../../services/identity-session.service';
import {
  getProfile,
  type ProfileField,
  type ProfileUser,
} from '../../services/profile.service';
import { RequestError } from '../../types/api';
import { fallbackImageUrl, formatDisplayDate } from '../../utils/format';

function isCompanyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type SettingView = 'main' | 'basic-info' | 'identity-binding';

Page({
  data: {
    settingView: 'main' as SettingView,
    navTitle: 'Setting',
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
    basicInfoStatus: 'idle' as 'idle' | 'loading' | 'success' | 'error',
    errorText: '',
    basicInfoErrorText: '',
    bindSheetVisible: false,
    bindCompanyEmail: '',
    bindEmailError: '',
    identityBound: false,
    boundIdentity: null as IdentityBindingRecord | null,
    boundAtDisplay: '',
    bindSubmitting: false,
    identityBindingLoading: false,
  },

  onShow() {
    const { settingView } = this.data;
    if (settingView === 'main') {
      void this.syncIdentityAndProfile();
      return;
    }
    if (settingView === 'basic-info') {
      void this.loadBasicInfo();
      return;
    }
    if (settingView === 'identity-binding') {
      void this.loadIdentityBindingState();
    }
  },

  applyIdentityBindingRecord(record: IdentityBindingRecord | null) {
    if (!record) {
      this.setData({
        identityBound: false,
        boundIdentity: null,
        boundAtDisplay: '',
      });
      return;
    }
    this.setData({
      identityBound: true,
      boundIdentity: record,
      boundAtDisplay: record.boundAt ? formatDisplayDate(record.boundAt) : '',
      bindSheetVisible: false,
    });
  },

  async loadIdentityBindingState() {
    this.setData({ identityBindingLoading: true });
    try {
      const record = await syncIdentitySession({ force: true });
      this.applyIdentityBindingRecord(record);
    } catch {
      this.applyIdentityBindingRecord(getStoredIdentityBinding());
    } finally {
      this.setData({ identityBindingLoading: false });
    }
  },

  async syncIdentityAndProfile() {
    await syncIdentitySession();
    await this.loadProfile();
  },

  async loadProfile() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const result = await getProfile();
      this.setData({
        user: result.user,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '个人中心加载失败',
      });
    }
  },

  async loadBasicInfo() {
    this.setData({ basicInfoStatus: 'loading', basicInfoErrorText: '' });
    try {
      const result = await getProfile();
      this.setData({
        fields: result.fields,
        basicInfoStatus: 'success',
      });
    } catch (error) {
      this.setData({
        basicInfoStatus: 'error',
        basicInfoErrorText: error instanceof RequestError ? error.message : '基本信息加载失败',
      });
    }
  },

  onSettingBack() {
    this.setData({
      settingView: 'main',
      navTitle: 'Setting',
      basicInfoStatus: 'idle',
      bindSheetVisible: false,
      bindCompanyEmail: '',
      bindEmailError: '',
    });
  },

  onBasicInfoTap() {
    this.setData({
      settingView: 'basic-info',
      navTitle: '基本信息',
    });
    void this.loadBasicInfo();
  },

  onIdentityBindingTap() {
    this.setData({
      settingView: 'identity-binding',
      navTitle: '身份绑定',
      bindCompanyEmail: '',
      bindEmailError: '',
    });
    void this.loadIdentityBindingState();
  },

  onBindTap() {
    if (this.data.identityBound || this.data.bindSheetVisible) {
      return;
    }
    this.setData({
      bindSheetVisible: true,
      bindEmailError: '',
    });
  },

  onCloseBindSheet() {
    this.setData({
      bindSheetVisible: false,
      bindEmailError: '',
    });
  },

  onBindEmailInput(event: WechatMiniprogram.Input) {
    this.setData({
      bindCompanyEmail: event.detail.value,
      bindEmailError: '',
    });
  },

  async onSubmitBindEmail() {
    const email = this.data.bindCompanyEmail.trim();
    if (!email) {
      this.setData({ bindEmailError: '请输入公司邮箱' });
      return;
    }
    if (!isCompanyEmail(email)) {
      this.setData({ bindEmailError: '请输入有效的邮箱地址' });
      return;
    }
    if (this.data.bindSubmitting) {
      return;
    }
    this.setData({ bindSubmitting: true, bindEmailError: '' });
    try {
      const record = await submitIdentityBinding(email);
      applyIdentityBindingToSession(record);
      this.applyIdentityBindingRecord(record);
      this.setData({
        bindCompanyEmail: '',
      });
      wx.showToast({
        title: '绑定成功',
        icon: 'success',
      });
      if (this.data.settingView === 'main') {
        void this.loadProfile();
      }
    } catch (error) {
      this.setData({
        bindEmailError: error instanceof RequestError ? error.message : '绑定失败，请稍后重试',
      });
    } finally {
      this.setData({ bindSubmitting: false });
    }
  },

  onAvatarError() {
    const { user } = this.data;
    if (!user) {
      return;
    }
    this.setData({
      user: {
        ...user,
        avatar: fallbackImageUrl(user.avatar),
      },
    });
  },
});
