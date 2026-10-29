import { getCompanyActivities } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';

Page({
  data: {
    events: [] as Array<{
      id: string;
      title: string;
      subtitle: string;
      icon: string;
      iconBg: string;
      path: string;
    }>,
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  navLocked: false,
  navLockTimer: 0 as number,

  onLoad() {
    void this.loadEvents();
  },

  onShow() {
    this.navLocked = true;
    if (this.navLockTimer) {
      clearTimeout(this.navLockTimer);
    }
    this.navLockTimer = setTimeout(() => {
      this.navLocked = false;
      this.navLockTimer = 0;
    }, 350) as unknown as number;
  },

  onUnload() {
    if (this.navLockTimer) {
      clearTimeout(this.navLockTimer);
      this.navLockTimer = 0;
    }
  },

  async loadEvents() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const result = await getCompanyActivities();
      this.setData({
        events: result.items,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '公司事件加载失败',
      });
    }
  },

  onEventTap(event: WechatMiniprogram.TouchEvent) {
    if (this.navLocked) {
      return;
    }
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    const target = this.data.events.find((item) => item.id === id);
    if (!target?.path) {
      return;
    }
    this.navLocked = true;
    wx.navigateTo({
      url: target.path,
      complete: () => {
        setTimeout(() => {
          this.navLocked = false;
        }, 350);
      },
    });
  },
});
