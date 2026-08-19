import { getBrand, type BrandValue } from '../../services/brand.service';
import { RequestError } from '../../types/api';

Page({
  data: {
    hero: '',
    intro: '',
    vision: '',
    values: [] as BrandValue[],
    brands: [] as string[],
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  onLoad() {
    void this.loadBrand();
  },

  async loadBrand() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const brand = await getBrand();
      this.setData({
        ...brand,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '品牌信息加载失败',
      });
    }
  },
});
