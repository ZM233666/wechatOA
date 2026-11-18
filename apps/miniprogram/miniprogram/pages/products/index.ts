import { getProductCategories, type ProductCategoryView } from './products.service';
import { fallbackImageUrl } from '../../utils/format';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../utils/friendly-page-error';

Page({
  data: {
    keyword: '',
    categories: [] as ProductCategoryView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    emptyTitle: '',
    emptyDesc: '',
    pageAlive: true,
    requesting: false,
    contactVisible: false,
    contactInfo: {
      phone: '待补充',
      email: '待补充',
      address: '待补充',
      hours: '待补充',
    },
  },

  onLoad() {
    this.setData({ pageAlive: true });
    void this.loadProducts();
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  async loadProducts() {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    this.data.requesting = true;
    this.setData({ requesting: true, pageStatus: 'loading' });
    try {
      const result = await getProductCategories();
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({
        categories: result.categories,
        requesting: false,
        pageStatus: result.categories.length === 0 ? 'empty' : 'success',
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      logPageLoadIssue('products-index', error);
      this.setData({
        requesting: false,
        ...friendlyUnavailablePageData(),
      });
    }
  },

  onRetry() {
    void this.loadProducts();
  },

  onCategoryImageError(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    this.setData({
      categories: this.data.categories.map((item) =>
        item.id === id ? { ...item, image: fallbackImageUrl(item.image) } : item,
      ),
    });
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
    wx.navigateTo({
      url: `/pages/products/search?keyword=${encodeURIComponent(keyword)}`,
    });
  },

  onCategoryTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/products/detail?id=${id}`,
    });
  },

  onContact() {
    this.setData({ contactVisible: true });
  },

  onCloseContact() {
    this.setData({ contactVisible: false });
  },

  onContactPanelTap() {
    // 阻止点击弹窗内容时关闭
  },
});