import { getNewsList, type NewsListItemView } from '../../services/news.service';
import { RequestError } from '../../types/api';
import { fallbackImageUrl } from '../../utils/format';

Page({
  data: {
    newsList: [] as NewsListItemView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    page: 1,
    hasNext: false,
    loadingMore: false,
    pageAlive: true,
    requesting: false,
  },

  onLoad() {
    this.setData({ pageAlive: true });
    void this.loadNews(true);
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  onReachBottom() {
    if (
      !this.data.pageAlive ||
      this.data.pageStatus !== 'success' ||
      !this.data.hasNext ||
      this.data.loadingMore ||
      this.data.requesting
    ) {
      return;
    }
    void this.loadNews(false);
  },

  async loadNews(reset: boolean) {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    this.data.requesting = true;
    if (reset) {
      this.data.hasNext = false;
      this.data.loadingMore = false;
      this.setData({
        requesting: true,
        pageStatus: 'loading',
        errorText: '',
        page: 1,
        newsList: [],
        hasNext: false,
        loadingMore: false,
      });
    } else {
      this.data.loadingMore = true;
      this.setData({ requesting: true, loadingMore: true });
    }
    try {
      const page = reset ? 1 : this.data.page + 1;
      const result = await getNewsList({ page, pageSize: 5 });
      if (!this.data.pageAlive) {
        return;
      }
      const newsList = reset ? result.items : this.data.newsList.concat(result.items);
      this.data.requesting = false;
      this.data.loadingMore = false;
      this.data.hasNext = result.hasNext;
      this.setData({
        newsList,
        page: result.page,
        hasNext: result.hasNext,
        loadingMore: false,
        requesting: false,
        pageStatus: newsList.length === 0 ? 'empty' : 'success',
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.data.loadingMore = false;
      this.setData({
        loadingMore: false,
        requesting: false,
        pageStatus: reset ? 'error' : this.data.pageStatus,
        errorText: error instanceof RequestError ? error.message : '新闻加载失败',
      });
    }
  },

  onRetry() {
    void this.loadNews(true);
  },

  onNewsImageError(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    this.setData({
      newsList: this.data.newsList.map((item) =>
        item.id === id ? { ...item, image: fallbackImageUrl(item.image) } : item,
      ),
    });
  },

  onNewsTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/news/detail?id=${id}`,
    });
  },
});
