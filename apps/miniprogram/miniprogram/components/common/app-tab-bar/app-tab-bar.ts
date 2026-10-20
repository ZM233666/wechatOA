import { TAB_BAR_ITEMS, inferTabRouteKey } from '../../../constants/routes';
import type { TabRouteKey } from '../../../types/navigation';

Component({
  properties: {
    /** 高亮 Tab；不传则按当前页面路径推断 */
    active: {
      type: String,
      value: '',
    },
  },
  data: {
    tabs: TAB_BAR_ITEMS,
    activeKey: 'home' as TabRouteKey,
  },
  lifetimes: {
    attached() {
      const pages = getCurrentPages();
      const route = pages[pages.length - 1]?.route ?? '';
      const fromProp = (this.properties.active || '').trim() as TabRouteKey;
      const activeKey =
        fromProp && TAB_BAR_ITEMS.some((tab) => tab.key === fromProp)
          ? fromProp
          : inferTabRouteKey(route);
      this.setData({ activeKey });
    },
  },
  methods: {
    onTabTap(event: WechatMiniprogram.TouchEvent) {
      const path = event.currentTarget.dataset.path as string | undefined;
      if (!path) {
        return;
      }
      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      const currentRoute = current?.route ? `/${current.route}` : '';
      if (path === currentRoute) {
        return;
      }
      wx.switchTab({
        url: path,
        fail() {
          wx.showToast({ title: '无法切换 Tab', icon: 'none' });
        },
      });
    },
  },
});
