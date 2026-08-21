import { OPEN_POSITIONS, getOpenPositionById } from '../../../mock/open-positions';

Page({
  data: {
    positions: OPEN_POSITIONS,
  },

  navLocked: false,
  navLockTimer: 0 as number,

  onShow() {
    // 从详情返回后，短时锁定，避免残留点击再次打开上一岗位
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

  onJobTap(event: WechatMiniprogram.TouchEvent) {
    if (this.navLocked) {
      return;
    }
    const { jobId } = event.currentTarget.dataset as { jobId?: string };
    if (!jobId || !getOpenPositionById(jobId)) {
      return;
    }
    this.navLocked = true;
    wx.navigateTo({
      url: `/pages/kb-life/open-positions/detail?id=${encodeURIComponent(jobId)}`,
      complete: () => {
        // 若跳转失败（如快速连点），稍后解锁；成功进入详情后由 onShow 重新加锁
        setTimeout(() => {
          this.navLocked = false;
        }, 350);
      },
    });
  },
});
