import { getBrand, type BrandValue } from './brand.service';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../utils/friendly-page-error';

Page({
  data: {
    companyName: '',
    hero: '',
    intro: '',
    vision: '',
    values: [] as BrandValue[],
    brands: [] as string[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
  },

  onLoad() {
    void this.loadBrand();
  },

  onPullDownRefresh() {
    void this.loadBrand(true);
  },

  async loadBrand(fromPullDown = false) {
    if (!fromPullDown) {
      this.setData({ pageStatus: 'loading', errorText: '' });
    }
    try {
      const brand = await getBrand();
      const hasContent =
        Boolean(brand.companyName?.trim()) ||
        Boolean(brand.intro?.trim()) ||
        Boolean(brand.vision?.trim()) ||
        brand.values.length > 0 ||
        brand.brands.length > 0;
      if (!hasContent) {
        this.setData({
          pageStatus: 'empty',
          companyName: '',
          hero: '',
          intro: '',
          vision: '',
          values: [],
          brands: [],
        });
        return;
      }
      this.setData({
        ...brand,
        pageStatus: 'success',
      });
    } catch (error) {
      logPageLoadIssue('brand', error);
      this.setData({
        ...friendlyUnavailablePageData(),
      });
    } finally {
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
    }
  },

  onRetry() {
    void this.loadBrand();
  },
});
