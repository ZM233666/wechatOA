import { getProductDetail, type ProductCategoryView } from '../../services/products.service';
import { RequestError } from '../../types/api';
import { fallbackImageUrl } from '../../utils/format';

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

  async loadDetail() {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    const id = this.data.productId;
    if (!id) {
      this.setData({ pageStatus: 'empty', category: null });
      return;
    }
    this.data.requesting = true;
    this.setData({ requesting: true, pageStatus: 'loading', errorText: '' });
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
      const status = error instanceof RequestError && error.statusCode === 404 ? 'empty' : 'error';
      this.data.requesting = false;
      this.setData({
        category: null,
        pageStatus: status,
        requesting: false,
        errorText: error instanceof RequestError ? error.message : '产品详情加载失败',
      });
    }
  },

  onRetry() {
    void this.loadDetail();
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

  onRelatedServices() {
    wx.switchTab({
      url: '/pages/services/index',
    });
  },

  onViewCases() {
    wx.navigateTo({
      url: '/pages/cases/index',
    });
  },
});
