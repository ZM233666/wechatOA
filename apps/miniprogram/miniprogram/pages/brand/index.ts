import { getBrand, type BrandValue } from './brand.service';
import { RequestError } from '../../types/api';
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
      const status =
        error instanceof RequestError && error.statusCode === 404 ? 'empty' : 'error';
      this.setData({
        pageStatus: status,
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
