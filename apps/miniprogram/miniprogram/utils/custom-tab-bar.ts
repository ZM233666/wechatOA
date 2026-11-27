import type { TabRouteKey } from '../types/navigation';

/** 四个主 Tab 使用自定义底栏时，切换后同步高亮。底栏未挂载时不做事。 */
export function syncCustomTabBar(activeKey: TabRouteKey): void {
  const page = getCurrentPages().slice(-1)[0] as
    | (WechatMiniprogram.Page.TrivialInstance & {
        getTabBar?: () => { setData: (data: { activeKey: TabRouteKey }) => void } | null;
      })
    | undefined;
  page?.getTabBar?.()?.setData({ activeKey });
}
