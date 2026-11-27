import {
  getHighlightMomentAlbum,
  type HighlightMomentAlbumDetailView,
  type HighlightMomentAlbumImageView,
} from '../../../../../services/kb-life.service';
import { friendlyUnavailablePageData, logPageLoadIssue, standbyPageData } from '../../../../../utils/friendly-page-error';
import { rejectNonEmployeeAccess } from '../../../../../utils/identity-access';

function stripPresignedVersion(url: string): string {
  if (!url || url.indexOf('X-Amz-Signature=') < 0) {
    return url;
  }
  return url.replace(/&v=[^&#]*/gi, '');
}

function cleanAlbum(album: HighlightMomentAlbumDetailView): HighlightMomentAlbumDetailView {
  return {
    ...album,
    coverImage: stripPresignedVersion(album.coverImage),
    images: album.images.map((image) => ({
      ...image,
      url: stripPresignedVersion(image.url),
    })),
  };
}

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
    if (rejectNonEmployeeAccess('Highlights')) {
      return;
    }
    const albumId = query.id?.trim() ?? '';
    this.setData({ albumId });
    if (!albumId) {
      this.setData(standbyPageData());
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
        this.setData(standbyPageData());
        return;
      }
      this.setData({ album: cleanAlbum(album), pageStatus: 'success' });
    } catch (error) {
      if (keepContent) {
        return;
      }
      logPageLoadIssue('highlight-moment-album', error);
      this.setData(friendlyUnavailablePageData());
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
