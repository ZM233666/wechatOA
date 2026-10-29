/**
 * 原「公司事件」导航 hub（年会 / 团建 / 体检 / 精彩瞬间）已下线。
 * KB Life 入口直链 `highlight-moments/index`；保留本页仅作旧路径兼容跳转。
 * 恢复 hub：见 fixtures/kb-life/activities-nav-items.disabled.json
 */
Page({
  onLoad() {
    wx.redirectTo({
      url: '/subpackages/kb-life/events/highlight-moments/index',
    });
  },
});
