import { getApiBaseUrl } from './config/env';
import {
  getIdentitySessionRevision,
  getIdentitySessionSnapshot,
  syncIdentitySession,
} from './services/identity-session.service';

App<IAppOption>({
  globalData: {
    apiBaseUrl: '',
    identitySession: getIdentitySessionSnapshot(),
    identitySessionRevision: getIdentitySessionRevision(),
  },
  onLaunch() {
    this.globalData.apiBaseUrl = getApiBaseUrl();
    this.globalData.identitySession = getIdentitySessionSnapshot();
    this.globalData.identitySessionRevision = getIdentitySessionRevision();
    try {
      wx.removeStorageSync('profileRoleKey');
    } catch {
      // ignore
    }
    void syncIdentitySession();
  },
});
