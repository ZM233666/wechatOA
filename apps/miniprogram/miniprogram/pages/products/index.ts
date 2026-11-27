/**
 * 临时版产品介绍：用 web-view 打开克诺尔官网产品页。
 * 原小程序内页面保存在同目录 index.backup.ts.txt / index.backup.wxml.txt，
 * 恢复时分别覆盖 index.ts 与 index.wxml。样式仍在 index.wxss。
 */
const PRODUCT_PORTFOLIO_URL =
  'https://rail.knorr-bremse.com/en/cn/portfolio/products-and-systems/';

Page({
  data: {
    url: PRODUCT_PORTFOLIO_URL,
  },
});
