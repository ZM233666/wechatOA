import {
  getCompanyActivities,
  type HighlightMomentAlbumSummaryView,
} from '../../../../services/kb-life.service';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../../utils/friendly-page-error';

Page({
  data: {
    pageStatus: 'loading' as 'loading' | 'success' | 'empty',
    emptyTitle: '',
    emptyDesc: '',
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
    const keepContent = this.data.pageStatus === 'success' && this.data.section.albums.length > 0;
    if (!keepContent) {
      this.setData({ pageStatus: 'loading', errorText: '' });
    }
    try {
      const result = await getCompanyActivities();
      if (!result.highlightMoments?.albums.length) {
        this.setData(friendlyUnavailablePageData({ title: '暂无活动相册' }));
        return;
      }
      this.setData({
        section: result.highlightMoments,
        pageStatus: 'success',
      });
    } catch (error) {
      if (keepContent) {
        return;
      }
      logPageLoadIssue('highlight-moments', error);
      this.setData(friendlyUnavailablePageData({ title: '暂无活动相册' }));
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
