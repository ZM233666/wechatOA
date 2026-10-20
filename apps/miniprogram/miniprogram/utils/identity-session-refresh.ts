import {
  getIdentitySessionRevision,
  subscribeIdentitySessionChanged,
} from '../services/identity-session.service';

export type IdentitySessionRefreshHost = WechatMiniprogram.Page.TrivialInstance & {
  lastIdentitySessionRevision?: number;
  __identitySessionUnsubscribe?: () => void;
};

/** Tab 页 onLoad 注册：身份同步/绑定变更时自动重拉列表 */
export function bindIdentitySessionRefresh(
  host: IdentitySessionRefreshHost,
  reload: () => void,
): void {
  host.lastIdentitySessionRevision = getIdentitySessionRevision();
  host.__identitySessionUnsubscribe = subscribeIdentitySessionChanged(() => {
    refreshIfIdentitySessionChanged(host, reload);
  });
}

export function unbindIdentitySessionRefresh(host: IdentitySessionRefreshHost): void {
  host.__identitySessionUnsubscribe?.();
  host.__identitySessionUnsubscribe = undefined;
}

/** Tab 页 onShow 调用：从 Setting 绑定后切回时补一次刷新 */
export function refreshIfIdentitySessionChanged(
  host: IdentitySessionRefreshHost,
  reload: () => void,
): boolean {
  const current = getIdentitySessionRevision();
  if (host.lastIdentitySessionRevision === current) {
    return false;
  }
  host.lastIdentitySessionRevision = current;
  reload();
  return true;
}
