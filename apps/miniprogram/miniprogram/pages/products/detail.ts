import { getProductDetail, peekProductDetail, type ProductCategoryView } from './products.service';
import { fallbackImageUrl } from '../../utils/format';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../utils/friendly-page-error';

Page({
  data: {
    productId: '',
    category: null as ProductCategoryView | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    pageAlive: true,
    requesting: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ pageAlive: true, productId: query.id ?? '' });
    void this.loadDetail();
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  async loadDetail(force = false) {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    const id = this.data.productId;
    if (!id) {
      this.setData({ pageStatus: 'empty', category: null });
      return;
    }
    const cached = force ? null : peekProductDetail(id);
    if (cached) {
      this.setData({ category: cached, pageStatus: 'success', requesting: false, errorText: '' });
      return;
    }
    const keepContent = Boolean(this.data.category);
    this.data.requesting = true;
    this.setData(
      keepContent ? { requesting: true, errorText: '' } : { requesting: true, pageStatus: 'loading', errorText: '' },
    );
    try {
      const category = await getProductDetail(id);
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({ category, pageStatus: 'success', requesting: false });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      logPageLoadIssue('product-detail', error);
      if (this.data.category) {
        this.setData({ requesting: false });
        return;
      }
      this.setData({
        category: null,
        requesting: false,
        ...friendlyUnavailablePageData(),
      });
    }
  },

  onRetry() {
    void this.loadDetail(true);
  },

  onCoverImageError() {
    if (!this.data.category) {
      return;
    }
    this.setData({
      category: {
        ...this.data.category,
        image: fallbackImageUrl(this.data.category.image),
      },
    });
  },

  onRelatedImageError(event: WechatMiniprogram.TouchEvent) {
    const index = Number((event.currentTarget.dataset as { index?: number }).index);
    if (!this.data.category || Number.isNaN(index) || !this.data.category.products[index]) {
      return;
    }
    this.setData({
      category: {
        ...this.data.category,
        products: this.data.category.products.map((item, itemIndex) =>
          itemIndex === index ? { ...item, img: fallbackImageUrl(item.img) } : item,
        ),
      },
    });
  },

  onMoreProducts() {
    const system = this.data.productId || this.data.category?.id || '';
    const url = system
      ? `/pages/products/list?system=${encodeURIComponent(system)}`
      : '/pages/products/list';
    wx.navigateTo({
      url,
      fail: (error) => {
        wx.showToast({
          title: '无法打开产品列表',
          icon: 'none',
        });
        console.error('[products/detail] navigateTo list failed', error, url);
      },
    });
  },
});
