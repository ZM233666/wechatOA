import {
  getHighlightMomentAlbum,
  type HighlightMomentAlbumImageView,
} from '../../../../../services/kb-life.service';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../../../utils/friendly-page-error';

Page({
  data: {
    albumId: '',
    pageStatus: 'loading' as 'loading' | 'success' | 'empty',
    emptyTitle: '',
    emptyDesc: '',
    errorText: '',
    album: {
      id: '',
      title: '',
      subtitle: '',
      content: '',
      dateLabel: '',
      coverImage: '',
      images: [] as HighlightMomentAlbumImageView[],
    },
  },

  skipShowRefresh: true,

  onLoad(query: Record<string, string | undefined>) {
    const albumId = query.id?.trim() ?? '';
    this.setData({ albumId });
    if (!albumId) {
      this.setData(friendlyUnavailablePageData({ title: '暂无相册' }));
      return;
    }
    void this.loadAlbum();
  },

  onShow() {
    if (this.skipShowRefresh) {
      this.skipShowRefresh = false;
      return;
    }
    if (this.data.albumId) {
      void this.loadAlbum();
    }
  },

  async loadAlbum() {
    const keepContent = this.data.pageStatus === 'success' && this.data.album.images.length > 0;
    if (!keepContent) {
      this.setData({ pageStatus: 'loading', errorText: '' });
    }
    try {
      const album = await getHighlightMomentAlbum(this.data.albumId);
      if (!album) {
        this.setData(friendlyUnavailablePageData({ title: '暂无相册' }));
        return;
      }
      this.setData({ album, pageStatus: 'success' });
    } catch (error) {
      if (keepContent) {
        return;
      }
      logPageLoadIssue('highlight-moment-album', error);
      this.setData(friendlyUnavailablePageData({ title: '暂无相册' }));
    }
  },

  onPreviewImage(event: WechatMiniprogram.TouchEvent) {
    const { url } = event.currentTarget.dataset as { url?: string };
    if (!url) {
      return;
    }
    const images = this.data.album.images;
    const current = images.find((item) => item.url === url);
    if (!current) {
      return;
    }
    if (current.allowDownload) {
      const downloadableUrls = images.filter((item) => item.allowDownload).map((item) => item.url);
      wx.previewImage({
        current: url,
        urls: downloadableUrls.length ? downloadableUrls : [url],
        showmenu: true,
      });
      return;
    }
    wx.previewImage({
      current: url,
      urls: [url],
      showmenu: false,
    });
  },
});
