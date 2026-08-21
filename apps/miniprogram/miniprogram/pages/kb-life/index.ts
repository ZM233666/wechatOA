import { COMING_SOON_TOAST } from '../../constants/routes';
import {
  getKbLifeEntries,
  getWetalkIssues,
  type CampusService,
  type LifeBanner,
  type WetalkCover,
} from '../../services/kb-life.service';
import { RequestError } from '../../types/api';
import {
  getStoredCampusLocation,
  setStoredCampusLocation,
  withCampusLocationQuery,
} from '../../utils/campus-location';
import { shouldBlockWetalkForNonEmployee } from '../../utils/wetalk';
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
    navTitle: 'KB Life',
    listVisible: false,
    deniedVisible: false,
    readerVisible: false,
    readerIssueId: '',
    wetalkItems: [] as WetalkCover[],
    listStatus: 'idle' as 'idle' | 'loading' | 'success' | 'empty' | 'error',
    listErrorText: '',
    shareTitle: 'WeTalk E-Magazine',
    shareImage: '',
  },

  onLoad() {
    void this.loadEntries();
  },

  onShareAppMessage() {
    return {
      title: this.data.shareTitle || 'WeTalk E-Magazine',
      path: '/pages/kb-life/index',
      imageUrl: this.data.shareImage || undefined,
    };
  },

  async loadEntries() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getKbLifeEntries();
      const selectedLocation = getStoredCampusLocation(result.locations);
      const locationIndex = Math.max(result.locations.indexOf(selectedLocation), 0);
      setStoredCampusLocation(selectedLocation, result.locations);
      this.setData({
        banners: result.banners,
        locations: result.locations,
        locationIndex,
        selectedLocation,
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

  async loadWetalkList() {
    this.setData({ listStatus: 'loading', listErrorText: '' });
    try {
      const items = await getWetalkIssues();
      this.setData({
        wetalkItems: items,
        listStatus: items.length ? 'success' : 'empty',
      });
    } catch (error) {
      this.setData({
        listStatus: 'error',
        listErrorText: error instanceof RequestError ? error.message : 'WeTalk 列表加载失败',
      });
    }
  },

  onLocationChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    const selectedLocation = setStoredCampusLocation(
      this.data.locations[index] ?? this.data.locations[0],
      this.data.locations,
    );
    this.setData({
      locationIndex: index,
      selectedLocation,
    });
  },

  onCampusTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    const target = this.data.campusServices.find((item) => item.id === id);
    if (target?.path) {
      wx.navigateTo({
        url: withCampusLocationQuery(target.path, this.data.selectedLocation),
      });
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

  onWetalkTap() {
    if (shouldBlockWetalkForNonEmployee()) {
      this.setData({
        deniedVisible: true,
        listVisible: false,
        readerVisible: false,
        readerIssueId: '',
        navTitle: 'WeTalk E-Magazine',
      });
      return;
    }
    this.setData({
      listVisible: true,
      deniedVisible: false,
      readerVisible: false,
      readerIssueId: '',
      navTitle: 'WeTalk E-Magazine',
    });
    if (this.data.listStatus === 'idle' || this.data.listStatus === 'error') {
      void this.loadWetalkList();
    }
  },

  onWetalkIssueTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    if (shouldBlockWetalkForNonEmployee()) {
      this.setData({
        deniedVisible: true,
        listVisible: false,
        readerVisible: false,
        readerIssueId: '',
      });
      return;
    }
    const issue = this.data.wetalkItems.find((item) => item.id === id);
    this.setData({
      readerVisible: true,
      readerIssueId: id,
      shareTitle: issue?.title || 'WeTalk E-Magazine',
      shareImage: issue?.image || '',
    });
  },

  onReaderClose() {
    this.setData({
      readerVisible: false,
      readerIssueId: '',
    });
  },

  onListBack() {
    this.setData({
      listVisible: false,
      deniedVisible: false,
      readerVisible: false,
      readerIssueId: '',
      navTitle: 'KB Life',
    });
  },

  onDeniedRequest() {
    wx.showToast({
      title: 'Permission request sent to admin',
      icon: 'none',
    });
    setTimeout(() => {
      this.onListBack();
    }, 1000);
  },

  onComingSoon() {
    wx.showToast({
      title: COMING_SOON_TOAST,
      icon: 'none',
    });
  },
});
