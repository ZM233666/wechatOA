import { openAccessDeniedPage, openIdentityBindingInProfile } from '../../../../utils/identity-access';

/** 兼容旧路径：进入后转到通用无权限页 */
Page({
  onLoad() {
    openAccessDeniedPage({ kind: 'unbound', title: 'KB Insights' });
  },

  onGoIdentityBinding() {
    openIdentityBindingInProfile();
  },
});
