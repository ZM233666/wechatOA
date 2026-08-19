import { getApiBaseUrl } from './config/env';

App<IAppOption>({
  globalData: {
    apiBaseUrl: '',
  },
  onLaunch() {
    this.globalData.apiBaseUrl = getApiBaseUrl();
  },
});
