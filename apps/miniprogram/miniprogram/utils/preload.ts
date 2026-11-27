type PreDownloadSubpackage = (options: {
  name: string;
  success?: () => void;
  fail?: (error: { errMsg?: string }) => void;
}) => void;

const started = new Set<string>();

/** 只下载分包，不执行页面。重复调用会被忽略。 */
export function preDownloadSubpackage(name: string): void {
  if (!name || started.has(name)) {
    return;
  }
  const preload = (wx as WechatMiniprogram.Wx & { preDownloadSubpackage?: PreDownloadSubpackage })
    .preDownloadSubpackage;
  if (!preload) {
    return;
  }
  started.add(name);
  preload({
    name,
    fail() {
      started.delete(name);
    },
  });
}

/** 首页空闲时只在 Wi-Fi 下预下载，避免和首屏请求抢蜂窝带宽。 */
export function preDownloadSubpackagesOnWifi(names: string[]): void {
  wx.getNetworkType({
    success(result) {
      if (result.networkType !== 'wifi') {
        return;
      }
      names.forEach((name) => preDownloadSubpackage(name));
    },
  });
}
