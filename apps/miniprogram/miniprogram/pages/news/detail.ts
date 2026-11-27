import { getApiBaseUrl } from '../../config/env';
import { getNewsDetail, peekNewsDetail, type NewsDetailView } from '../../services/news.service';
import { RequestError } from '../../types/api';
import { fallbackImageUrl } from '../../utils/format';
import { friendlyUnavailablePageData } from '../../utils/friendly-page-error';

Page({
  data: {
    apiBaseUrl: getApiBaseUrl(),
    newsId: '',
    news: null as NewsDetailView | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'not-found' | 'error',
    emptyTitle: '',
    emptyDesc: '',
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

  onShareAppMessage() {
    const news = this.data.news;
    if (!news) {
      return {
        title: '新闻详情',
        path: '/pages/news/index',
      };
    }
    return {
      title: news.shareTitle || news.title,
      path: `/pages/news/detail?id=${news.id}`,
      imageUrl: news.shareImage || news.image,
    };
  },

  async loadDetail(force = false) {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    const id = this.data.newsId;
    if (!id) {
      this.setData({ pageStatus: 'not-found', news: null });
      return;
    }
    const cached = force ? null : peekNewsDetail(id);
    if (cached) {
      this.setData({ news: cached, pageStatus: 'success', requesting: false, errorText: '' });
      return;
    }
    const keepContent = Boolean(this.data.news);
    this.data.requesting = true;
    this.setData(
      keepContent
        ? { requesting: true, errorText: '' }
        : { requesting: true, pageStatus: 'loading', errorText: '', favorited: false },
    );
    try {
      const news = await getNewsDetail(id);
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({
        news,
        pageStatus: 'success',
        requesting: false,
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      const status = error instanceof RequestError && error.statusCode === 404 ? 'not-found' : 'error';
      this.data.requesting = false;
      if (this.data.news) {
        this.setData({ requesting: false });
        return;
      }
      this.setData({
        ...friendlyUnavailablePageData(),
        news: null,
        pageStatus: status,
        requesting: false,
      });
    }
  },

  onRetry() {
    void this.loadDetail(true);
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
});
