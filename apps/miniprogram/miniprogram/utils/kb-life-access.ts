import {
  shouldBlockCampusServicesForUnbound,
} from './identity-access';

export const VISITOR_RESTRICTED_CAMPUS_SERVICE_IDS = new Set([
  'campus-map',
  'shuttle-bus',
  'cafeteria',
  'holiday',
]);

/** 园区地图 / 班车 / 食堂 / 假期日历不对未绑定身份开放 */
export function shouldBlockCampusServicesForVisitor(): boolean {
  return shouldBlockCampusServicesForUnbound();
}

export function isVisitorRestrictedCampusService(id?: string): boolean {
  return Boolean(id && VISITOR_RESTRICTED_CAMPUS_SERVICE_IDS.has(id));
}

/** 独立子页入口拦截：返回 true 表示已拒绝并应中止加载 */
export function rejectVisitorCampusAccess(): boolean {
  if (!shouldBlockCampusServicesForVisitor()) {
    return false;
  }
  wx.showToast({ title: '请先完成身份绑定', icon: 'none' });
  setTimeout(() => {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/kb-life/index' }) });
  }, 300);
  return true;
}
