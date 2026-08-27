import { COMING_SOON_TOAST } from '../../constants/routes';
import {
  getCampusMap,
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
    readerSource: 'wetalk' as 'wetalk' | 'campus-map',
    /** 上层页面展示的最近 1 期 */
    wetalkFeatured: null as WetalkCover | null,
    wetalkItems: [] as WetalkCover[],
    listStatus: 'idle' as 'idle' | 'loading' | 'success' | 'empty' | 'error',
    listErrorText: '',
    shareTitle: 'WeTalk E-Magazine',
    shareImage: '',
  },

  onLoad() {
    void this.loadEntries();
  },

  onShow() {
    void this.loadWetalkFeatured();
    if (this.data.listVisible) {
      void this.loadWetalkList();
    }
    const pendingMap = wx.getStorageSync('kbLifeOpenCampusMap') as string | undefined;
    if (pendingMap) {
      wx.removeStorageSync('kbLifeOpenCampusMap');
      const location = String(pendingMap);
      if (location) {
        this.setData({ selectedLocation: location });
        void this.openCampusMapReader();
      }
    }
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
      const [result] = await Promise.all([getKbLifeEntries(), this.loadWetalkFeatured()]);
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

  /** 上层卡片：仅最近 1 个（接口已按 PDF 时间倒序） */
  async loadWetalkFeatured() {
    try {
      const items = await getWetalkIssues();
      const featured = items[0] ?? null;
      this.setData({
        wetalkFeatured: featured,
        shareTitle: featured?.title || 'WeTalk E-Magazine',
        shareImage: featured?.image || '',
      });
      return featured;
    } catch {
      this.setData({ wetalkFeatured: null });
      return null;
    }
  },

  async loadWetalkList() {
    this.setData({ listStatus: 'loading', listErrorText: '' });
    try {
      const items = await getWetalkIssues();
      this.setData({
        wetalkItems: items,
        wetalkFeatured: items[0] ?? null,
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
    if (id === 'campus-map') {
      void this.openCampusMapReader();
      return;
    }
    const target = this.data.campusServices.find((item) => item.id === id);
    if (target?.path) {
      wx.navigateTo({
        url: withCampusLocationQuery(target.path, this.data.selectedLocation),
      });
      return;
    }
    this.onComingSoon();
  },

  /** PDF 地图在 Tab 页内打开以保留底部导航；无 PDF 时仍进独立缩放页 */
  async openCampusMapReader() {
    const location = this.data.selectedLocation || getStoredCampusLocation();
    try {
      wx.showLoading({ title: '加载中', mask: true });
      const map = await getCampusMap(location);
      wx.hideLoading();
      if (map.pdfUrl && map.pages.length) {
        this.setData({
          readerVisible: true,
          readerIssueId: map.location,
          readerSource: 'campus-map',
          listVisible: false,
          deniedVisible: false,
          shareTitle: map.title,
          shareImage: map.image,
        });
        return;
      }
    } catch {
      wx.hideLoading();
    }
    wx.navigateTo({
      url: withCampusLocationQuery('/pages/kb-life/campus-map/index', location),
    });
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
    const featured = this.data.wetalkFeatured;
    if (featured) {
      this.setData({
        readerVisible: true,
        readerIssueId: featured.id,
        readerSource: 'wetalk',
        deniedVisible: false,
        listVisible: false,
        shareTitle: featured.title,
        shareImage: featured.image,
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
    void this.loadWetalkList();
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
      readerSource: 'wetalk',
      shareTitle: issue?.title || 'WeTalk E-Magazine',
      shareImage: issue?.image || '',
    });
  },

  onReaderClose() {
    this.setData({
      readerVisible: false,
      readerIssueId: '',
      readerSource: 'wetalk',
    });
  },

  onListBack() {
    this.setData({
      listVisible: false,
      deniedVisible: false,
      readerVisible: false,
      readerIssueId: '',
      readerSource: 'wetalk',
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
