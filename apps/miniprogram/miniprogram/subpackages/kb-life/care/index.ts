/**
 * 临时版本地/全球关怀：用 web-view 打开克诺尔官网本地活动页。
 * 原小程序内页面保存在同目录 index.backup.ts.txt / index.backup.wxml.txt，
 * 恢复时分别覆盖 index.ts 与 index.wxml。样式仍在 index.wxss。
 */
import { rejectNonEmployeeAccess } from '../../../utils/identity-access';

const LOCAL_ACTIVITIES_URL =
  'https://rail.knorr-bremse.com/en/cn/about-us/knorr-bremse-in-china/local-activities/';

Page({
  data: {
    url: '',
  },

  onLoad() {
    if (rejectNonEmployeeAccess('Employee Care')) {
      return;
    }
    this.setData({ url: LOCAL_ACTIVITIES_URL });
  },
});
