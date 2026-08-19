import { getNewsDetail, type NewsDetailView } from '../../services/news.service';
import { RequestError } from '../../types/api';
import { fallbackImageUrl } from '../../utils/format';

Page({
  data: {
    newsId: '',
    news: null as NewsDetailView | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    favorited: false,
    pageAlive: true,
    requesting: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ pageAlive: true, newsId: query.id ?? '' });
    void this.loadDetail();
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  async loadDetail() {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    const id = this.data.newsId;
    if (!id) {
      this.setData({ pageStatus: 'empty', news: null });
      return;
    }
    this.data.requesting = true;
    this.setData({ requesting: true, pageStatus: 'loading', errorText: '' });
    try {
      const news = await getNewsDetail(id);
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({ news, pageStatus: 'success', requesting: false });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      const status = error instanceof RequestError && error.statusCode === 404 ? 'empty' : 'error';
      this.data.requesting = false;
      this.setData({
        news: null,
        pageStatus: status,
        requesting: false,
        errorText: error instanceof RequestError ? error.message : '新闻详情加载失败',
      });
    }
  },

  onRetry() {
    void this.loadDetail();
  },

  onCoverImageError() {
    if (!this.data.news) {
      return;
    }
    this.setData({
      news: {
        ...this.data.news,
        image: fallbackImageUrl(this.data.news.image),
      },
    });
  },

  onToggleFavorite() {
    const next = !this.data.favorited;
    this.setData({ favorited: next });
    wx.showToast({
      title: next ? '已加入收藏' : '已取消收藏',
      icon: 'none',
    });
  },

  onShare() {
    wx.showToast({
      title: 'Shared successfully',
      icon: 'none',
    });
  },
});
