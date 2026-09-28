import { getStoredProfileRole } from '../services/profile.service';

export const VISITOR_RESTRICTED_CAMPUS_SERVICE_IDS = new Set([
  'campus-map',
  'shuttle-bus',
  'cafeteria',
  'holiday',
]);

/** 园区地图 / 班车 / 食堂 / 假期日历不对 Visitor 开放 */
export function shouldBlockCampusServicesForVisitor(): boolean {
  return getStoredProfileRole() === 'Visitor';
}

export function isVisitorRestrictedCampusService(id?: string): boolean {
  return Boolean(id && VISITOR_RESTRICTED_CAMPUS_SERVICE_IDS.has(id));
}

/** 独立子页入口拦截：返回 true 表示已拒绝并应中止加载 */
export function rejectVisitorCampusAccess(): boolean {
  if (!shouldBlockCampusServicesForVisitor()) {
    return false;
  }
  wx.showToast({ title: '请先登录后访问', icon: 'none' });
  setTimeout(() => {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/kb-life/index' }) });
  }, 300);
  return true;
}
