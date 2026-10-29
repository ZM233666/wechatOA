import {
  getHighlightMomentAlbum,
  type HighlightMomentAlbumImageView,
} from '../../../../../services/kb-life.service';
import { RequestError } from '../../../../../types/api';

Page({
  data: {
    albumId: '',
    pageStatus: 'loading' as 'loading' | 'success' | 'not-found' | 'error',
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
      this.setData({ pageStatus: 'not-found' });
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
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const album = await getHighlightMomentAlbum(this.data.albumId);
      if (!album) {
        this.setData({ pageStatus: 'not-found' });
        return;
      }
      this.setData({ album, pageStatus: 'success' });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '相册加载失败',
      });
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
