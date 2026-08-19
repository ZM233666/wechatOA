import {
  getProductCategories,
  type ProductCategoryView,
  type ProductHeroSlide,
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
    slides: [] as ProductHeroSlide[],
    keyword: '',
    categories: [] as ProductCategoryView[],
    allCategories: [] as ProductCategoryView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    pageAlive: true,
    requesting: false,
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
        slides: result.slides,
        allCategories: result.categories,
        categories,
        requesting: false,
        pageStatus: result.categories.length === 0 ? 'empty' : 'success',
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

  onSlideImageError(event: WechatMiniprogram.TouchEvent) {
    const index = Number((event.currentTarget.dataset as { index?: number }).index);
    if (Number.isNaN(index) || !this.data.slides[index]) {
      return;
    }
    this.setData({
      slides: this.data.slides.map((item, itemIndex) =>
        itemIndex === index ? { ...item, image: fallbackImageUrl(item.image) } : item,
      ),
    });
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
    wx.showToast({
      title: '联系我们页面开发中',
      icon: 'none',
    });
  },
});
