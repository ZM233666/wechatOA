import {
  getProductList,
  getProductSystemHeading,
  resolveProductSystemId,
  type ProductListItemView,
} from './products.service';
import { fallbackImageUrl } from '../../utils/format';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../utils/friendly-page-error';

Page({
  data: {
    system: '',
    headingCn: '全部产品',
    headingEn: 'All Products',
    products: [] as ProductListItemView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    page: 1,
    hasNext: false,
    loadingMore: false,
    pageAlive: true,
    requesting: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const system = resolveProductSystemId(query.system) ?? '';
    const heading = getProductSystemHeading(system || undefined);
    this.setData({
      pageAlive: true,
      system,
      headingCn: heading.cn,
      headingEn: heading.en,
    });
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
      this.data.requesting
    ) {
      return;
    }
    void this.loadProducts(false);
  },

  async loadProducts(reset: boolean, fromPullDown = false) {
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
        errorText: '',
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
        category: this.data.system || undefined,
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
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      logPageLoadIssue('products-list', error);
      this.setData({
        loadingMore: false,
        requesting: false,
        pageStatus: reset ? 'empty' : this.data.pageStatus,
        ...(reset ? friendlyUnavailablePageData() : {}),
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
