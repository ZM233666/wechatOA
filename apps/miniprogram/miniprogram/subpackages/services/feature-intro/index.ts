import {
  hasStoredIdentityBinding,
  openIdentityBindingInProfile,
} from '../../../utils/identity-access';
import {
  bindIdentitySessionRefresh,
  refreshIfIdentitySessionChanged,
  unbindIdentitySessionRefresh,
} from '../../../utils/identity-session-refresh';
import {
  parseServiceFeatureKey,
  SERVICE_FEATURE_INTROS,
  type ServiceFeatureKey,
} from '../../../constants/service-feature-copy';

Page({
  data: {
    navTitle: '',
    subtitle: '',
    descZh: '',
    descEn: '',
    authHintZh: '',
    authHintEn: '',
    tone: 'blue' as 'blue' | 'gold',
    isBound: false,
    feature: '' as ServiceFeatureKey | '',
  },

  onLoad(query: Record<string, string | undefined>) {
    const feature = parseServiceFeatureKey(query.feature);
    if (!feature) {
      wx.showToast({ title: '页面不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/services/index' }) }), 400);
      return;
    }
    const copy = SERVICE_FEATURE_INTROS[feature];
    this.setData({
      feature,
      navTitle: copy.navTitle,
      subtitle: copy.subtitle,
      descZh: copy.descZh,
      descEn: copy.descEn,
      authHintZh: copy.authHintZh,
      authHintEn: copy.authHintEn,
      tone: copy.tone,
    });
    bindIdentitySessionRefresh(this, () => this.syncAccess());
    this.syncAccess();
  },

  onUnload() {
    unbindIdentitySessionRefresh(this);
  },

  onShow() {
    refreshIfIdentitySessionChanged(this, () => this.syncAccess());
  },

  syncAccess() {
    this.setData({ isBound: hasStoredIdentityBinding() });
  },

  onGoIdentityBinding() {
    openIdentityBindingInProfile();
  },

  onViewDescription() {
    wx.showModal({
      title: this.data.navTitle || '功能说明',
      content: this.data.descZh,
      showCancel: false,
      confirmText: '知道了',
    });
  },
});