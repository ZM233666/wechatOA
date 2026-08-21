import { COMPANY_EVENT_ITEMS } from '../../../mock/events';

Page({
  data: {
    events: COMPANY_EVENT_ITEMS,
  },

  navLocked: false,
  navLockTimer: 0 as number,

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
