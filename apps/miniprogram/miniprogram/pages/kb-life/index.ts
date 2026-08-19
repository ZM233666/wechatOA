import { COMING_SOON_TOAST } from '../../constants/routes';
import {
  getKbLifeEntries,
  type CampusService,
  type LifeBanner,
} from '../../services/kb-life.service';
import { RequestError } from '../../types/api';

Page({
  data: {
    banners: [] as LifeBanner[],
    locations: [] as string[],
    locationIndex: 0,
    selectedLocation: '',
    campusServices: [] as CampusService[],
    employeeServices: [] as CampusService[],
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
  },

  onLoad() {
    void this.loadEntries();
  },

  async loadEntries() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getKbLifeEntries();
      this.setData({
        banners: result.banners,
        locations: result.locations,
        locationIndex: 0,
        selectedLocation: result.locations[0] ?? '',
        campusServices: result.campusServices,
        employeeServices: result.employeeServices,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : 'KB Life 加载失败',
      });
    }
  },

  onLocationChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    this.setData({
      locationIndex: index,
      selectedLocation: this.data.locations[index] ?? this.data.locations[0],
    });
  },

  onCampusTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    const target = this.data.campusServices.find((item) => item.id === id);
    if (target?.path) {
      wx.navigateTo({ url: target.path });
      return;
    }
    this.onComingSoon();
  },

  onEmployeeTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    const target = this.data.employeeServices.find((item) => item.id === id);
    if (target?.path) {
      wx.navigateTo({ url: target.path });
      return;
    }
    this.onComingSoon();
  },

  onComingSoon() {
    wx.showToast({
      title: COMING_SOON_TOAST,
      icon: 'none',
    });
  },
});
