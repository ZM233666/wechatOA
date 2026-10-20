import { getHighlightMomentAlbum } from '../../../../../services/kb-life.service';
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
      dateLabel: '',
      coverImage: '',
      images: [] as string[],
    },
  },

  onLoad(query: Record<string, string | undefined>) {
    const albumId = query.id?.trim() ?? '';
    this.setData({ albumId });
    if (!albumId) {
      this.setData({ pageStatus: 'not-found' });
      return;
    }
    void this.loadAlbum();
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
    const urls = this.data.album.images;
    wx.previewImage({
      current: url,
      urls: urls.length ? urls : [url],
    });
  },
});
