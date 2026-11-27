import {
  getNewsCategories,
  getNewsList,
  prefetchNewsDetails,
  type NewsCategoryView,
  type NewsListItemView,
} from '../../services/news.service';
import { getApiBaseUrl } from '../../config/env';
import { fallbackImageUrl } from '../../utils/format';
import { friendlyUnavailablePageData, logPageLoadIssue, standbyContentFields } from '../../utils/friendly-page-error';

Page({
  data: {
    apiBaseUrl: getApiBaseUrl(),
    newsList: [] as NewsListItemView[],
    categories: [] as NewsCategoryView[],
    activeCategory: 'all',
    keyword: '',
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    page: 1,
    hasNext: false,
    loadingMore: false,
    listRefreshing: false,
    pageAlive: true,
    requesting: false,
  },

  onLoad() {
    this.setData({ pageAlive: true });
    void this.bootstrap();
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

  async bootstrap() {
    const categoriesRequest = getNewsCategories();
    void this.loadNews(true);
    try {
      const categories = await categoriesRequest;
      if (!this.data.pageAlive) {
        return;
      }
      this.setData({ categories: categories.length ? categories : [{ id: 'all', name: '全部', articleCount: 0 }] });
    } catch {
      if (!this.data.pageAlive) {
        return;
      }
      this.setData({
        categories: [{ id: 'all', name: '全部', articleCount: 0 }],
      });
    }
  },

  async loadNews(reset: boolean) {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    this.data.requesting = true;
    const keepList = reset && this.data.newsList.length > 0;
    if (reset) {
      this.data.hasNext = false;
      this.data.loadingMore = false;
      this.setData(
        keepList
          ? {
              requesting: true,
              listRefreshing: true,
              errorText: '',
              page: 1,
              hasNext: false,
              loadingMore: false,
            }
          : {
              requesting: true,
              listRefreshing: false,
              pageStatus: 'loading',
              errorText: '',
              page: 1,
              newsList: [],
              hasNext: false,
              loadingMore: false,
            },
      );
    } else {
      this.data.loadingMore = true;
      this.setData({ requesting: true, loadingMore: true });
    }
    try {
      const page = reset ? 1 : this.data.page + 1;
      const result = await getNewsList({
        page,
        pageSize: 5,
        category: this.data.activeCategory,
        keyword: this.data.keyword.trim() || undefined,
      });
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
        listRefreshing: false,
        requesting: false,
        pageStatus: newsList.length === 0 ? 'empty' : 'success',
        ...(newsList.length === 0
          ? !this.data.keyword.trim() && this.data.activeCategory === 'all'
            ? standbyContentFields()
            : { emptyTitle: '暂无匹配资讯', emptyDesc: '换个分类或关键词再试试', errorText: '' }
          : { emptyTitle: '', emptyDesc: '', errorText: '' }),
      });
      prefetchNewsDetails(result.items.slice(0, 3).map((item) => item.id));
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.data.loadingMore = false;
      if (keepList) {
        this.setData({ loadingMore: false, listRefreshing: false, requesting: false });
        wx.showToast({ title: '刷新失败，请稍后重试', icon: 'none' });
        return;
      }
      if (reset) {
        logPageLoadIssue('news-list', error);
      }
      this.setData({
        loadingMore: false,
        listRefreshing: false,
        requesting: false,
        ...(reset ? friendlyUnavailablePageData() : {}),
      });
    }
  },

  onCategoryTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id || id === this.data.activeCategory || this.data.requesting) {
      return;
    }
    this.setData({ activeCategory: id });
    void this.loadNews(true);
  },

  onSearchInput(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value });
  },

  onSearch() {
    void this.loadNews(true);
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

  onNewsTouchStart(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    prefetchNewsDetails([id]);
  },

  onNewsTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    prefetchNewsDetails([id]);
    wx.navigateTo({
      url: `/pages/news/detail?id=${id}`,
    });
  },
});
