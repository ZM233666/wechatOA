import { TAB_BAR_ITEMS } from '../constants/routes';
import type { TabRouteKey } from '../types/navigation';

Component({
  data: {
    tabs: TAB_BAR_ITEMS,
    activeKey: 'home' as TabRouteKey,
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
