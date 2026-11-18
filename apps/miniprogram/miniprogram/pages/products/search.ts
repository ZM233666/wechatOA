import { getProductList, type ProductListItemView } from './products.service';
import { fallbackImageUrl } from '../../utils/format';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../utils/friendly-page-error';

Page({
  data: {
    keyword: '',
    products: [] as ProductListItemView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty',
    emptyTitle: '',
    emptyDesc: '',
    page: 1,
    hasNext: false,
    loadingMore: false,
    pageAlive: true,
    requesting: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const keyword = (query.keyword ?? '').trim();
    this.setData({
      pageAlive: true,
      keyword,
    });
    if (!keyword) {
      this.setData({
        pageStatus: 'empty',
        emptyTitle: '请输入搜索关键词',
        emptyDesc: '可输入产品号、产品名称、参数等',
      });
      return;
    }
    void this.loadProducts(true);
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  onPullDownRefresh() {
    void this.loadProducts(true, true);
  },

  onReachBottom() {
    if (
      !this.data.pageAlive ||
      this.data.pageStatus !== 'success' ||
      !this.data.hasNext ||
      this.data.loadingMore ||
      this.data.requesting ||
      !this.data.keyword.trim()
    ) {
      return;
    }
    void this.loadProducts(false);
  },

  onSearchInput(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value });
  },

  onSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) {
      wx.showToast({ title: '请输入关键词', icon: 'none' });
      return;
    }
    void this.loadProducts(true);
  },

  async loadProducts(reset: boolean, fromPullDown = false) {
    const keyword = this.data.keyword.trim();
    if (!keyword) {
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
      return;
    }
    if (!this.data.pageAlive || this.data.requesting) {
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
      return;
    }
    this.data.requesting = true;
    if (reset) {
      this.data.hasNext = false;
      this.data.loadingMore = false;
      this.setData({
        requesting: true,
        pageStatus: 'loading',
        page: 1,
        products: [],
        hasNext: false,
        loadingMore: false,
      });
    } else {
      this.setData({ loadingMore: true, requesting: true });
    }

    const nextPage = reset ? 1 : this.data.page + 1;
    try {
      const result = await getProductList({
        page: nextPage,
        pageSize: 20,
        keyword,
      });
      if (!this.data.pageAlive) {
        return;
      }
      const products = reset ? result.items : [...this.data.products, ...result.items];
      this.data.requesting = false;
      this.setData({
        products,
        page: nextPage,
        hasNext: result.hasNext,
        loadingMore: false,
        requesting: false,
        pageStatus: products.length === 0 ? 'empty' : 'success',
        emptyTitle: products.length === 0 ? '暂无匹配产品' : '',
        emptyDesc: products.length === 0 ? '可尝试产品名称、产品号或参数关键词' : '',
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      logPageLoadIssue('products-search', error);
      this.setData({
        loadingMore: false,
        requesting: false,
        pageStatus: reset ? 'empty' : this.data.pageStatus,
        ...(reset
          ? friendlyUnavailablePageData({ title: '暂无匹配产品' })
          : {}),
      });
    } finally {
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
    }
  },

  onRetry() {
    void this.loadProducts(true);
  },

  onProductTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/products/detail?id=${encodeURIComponent(id)}`,
    });
  },

  onProductImageError(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    this.setData({
      products: this.data.products.map((item) =>
        item.id === id ? { ...item, image: fallbackImageUrl(item.image) } : item,
      ),
    });
  },
});