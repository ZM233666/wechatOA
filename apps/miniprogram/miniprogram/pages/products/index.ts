import {
  getProductCategories,
  type ProductCategoryView,
} from '../../services/products.service';
import { RequestError } from '../../types/api';
import { fallbackImageUrl } from '../../utils/format';

function filterCategories(list: ProductCategoryView[], keyword: string): ProductCategoryView[] {
  const value = keyword.trim().toLowerCase();
  if (!value) {
    return list;
  }
  return list.filter((item) => {
    const haystack = `${item.title} ${item.titleCn} ${item.subtitleEn} ${item.desc}`.toLowerCase();
    return haystack.indexOf(value) >= 0;
  });
}

Page({
  data: {
    keyword: '',
    categories: [] as ProductCategoryView[],
    allCategories: [] as ProductCategoryView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
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
    this.setData({ requesting: true, pageStatus: 'loading', errorText: '' });
    try {
      const result = await getProductCategories();
      if (!this.data.pageAlive) {
        return;
      }
      const categories = filterCategories(result.categories, this.data.keyword);
      this.data.requesting = false;
      this.setData({
        allCategories: result.categories,
        categories,
        requesting: false,
        pageStatus: categories.length === 0 ? 'empty' : 'success',
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({
        requesting: false,
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '产品加载失败',
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
    const patch = (item: ProductCategoryView) =>
      item.id === id ? { ...item, image: fallbackImageUrl(item.image) } : item;
    this.setData({
      categories: this.data.categories.map(patch),
      allCategories: this.data.allCategories.map(patch),
    });
  },

  onSearchInput(event: WechatMiniprogram.Input) {
    const keyword = event.detail.value;
    this.setData({
      keyword,
      categories: filterCategories(this.data.allCategories, keyword),
    });
  },

  onSearch() {
    this.setData({
      categories: filterCategories(this.data.allCategories, this.data.keyword),
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
