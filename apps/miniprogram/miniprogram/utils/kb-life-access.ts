import {
  openAccessDeniedPage,
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
export function rejectVisitorCampusAccess(title = ''): boolean {
  if (!shouldBlockCampusServicesForVisitor()) {
    return false;
  }
  openAccessDeniedPage({ kind: 'unbound', title });
  return true;
}
