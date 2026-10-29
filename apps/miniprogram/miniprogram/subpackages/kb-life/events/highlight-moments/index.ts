import {
  getCompanyActivities,
  type HighlightMomentAlbumSummaryView,
} from '../../../../services/kb-life.service';
import { RequestError } from '../../../../types/api';

Page({
  data: {
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    section: {
      title: '',
      subtitle: '',
      albums: [] as HighlightMomentAlbumSummaryView[],
    },
  },

  navLocked: false,
  navLockTimer: 0 as number,
  skipShowRefresh: true,

  onLoad() {
    void this.loadAlbums();
  },

  onShow() {
    if (this.skipShowRefresh) {
      this.skipShowRefresh = false;
    } else {
      void this.loadAlbums();
    }
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

  async loadAlbums() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const result = await getCompanyActivities();
      if (!result.highlightMoments?.albums.length) {
        this.setData({ pageStatus: 'empty' });
        return;
      }
      this.setData({
        section: result.highlightMoments,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '精彩瞬间加载失败',
      });
    }
  },

  onAlbumTap(event: WechatMiniprogram.TouchEvent) {
    if (this.navLocked) {
      return;
    }
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    this.navLocked = true;
    wx.navigateTo({
      url: `/subpackages/kb-life/events/highlight-moments/album/index?id=${encodeURIComponent(id)}`,
      complete: () => {
        setTimeout(() => {
          this.navLocked = false;
        }, 350);
      },
    });
  },
});
