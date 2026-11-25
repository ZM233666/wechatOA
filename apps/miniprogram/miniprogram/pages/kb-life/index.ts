import { COMING_SOON_TOAST } from '../../constants/routes';
import {
  getKbLifeEntries,
  getWetalkFeatured,
  readPersistedKbLifeEntries,
  type CampusService,
  type LifeBanner,
  type WetalkCover,
} from '../../services/kb-life.service';
import { readPersistedWetalkFeatured } from '../../services/wetalk.service';
import {
  getStoredCampusLocation,
  setStoredCampusLocation,
  withCampusLocationQuery,
} from '../../utils/campus-location';
import {
  isVisitorRestrictedCampusService,
  shouldBlockCampusServicesForVisitor,
} from '../../utils/kb-life-access';
import {
  hasStoredIdentityBinding,
  openAccessDeniedPage,
  openIdentityBindingInProfile,
} from '../../utils/identity-access';
import {
  bindIdentitySessionRefresh,
  refreshIfIdentitySessionChanged,
  unbindIdentitySessionRefresh,
} from '../../utils/identity-session-refresh';
import { shouldBlockWetalkForNonEmployee } from '../../utils/wetalk';
import {
  CONTENT_UNAVAILABLE_DESC,
  CONTENT_UNAVAILABLE_TITLE,
  friendlyUnavailablePageData,
  logPageLoadIssue,
} from '../../utils/friendly-page-error';

const KB_LIFE_REFRESH_INTERVAL_MS = 60_000;
/** 与 WeTalk 二级页 Magazine 卡片封面一致 */
const WETALK_MAGAZINE_COVER = '/subpackages/kb-life/assets/images/wetalk-coverpage.png';

Page({
  data: {
    banners: [] as LifeBanner[],
    locations: [] as string[],
    locationIndex: 0,
    selectedLocation: '',
    campusServices: [] as CampusService[],
    employeeServices: [] as CampusService[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty',
    emptyTitle: CONTENT_UNAVAILABLE_TITLE,
    emptyDesc: CONTENT_UNAVAILABLE_DESC,
    errorText: '',
    navTitle: 'KB Life',
    listVisible: false,
    deniedVisible: false,
    deniedKind: '' as '' | 'wetalk' | 'campus',
    identityBound: false,
    readerVisible: false,
    readerIssueId: '',
    readerSource: 'wetalk' as 'wetalk' | 'campus-map' | 'shuttle-bus',
    /** 上层页面展示的最近 1 期 */
    wetalkFeatured: null as WetalkCover | null,
    wetalkMagazineCover: WETALK_MAGAZINE_COVER,
    shareTitle: 'WeTalk News',
    shareImage: '',
  },

  onLoad() {
    bindIdentitySessionRefresh(this, () => {
      void this.loadEntries();
    });
    const persisted = readPersistedKbLifeEntries();
    const wetalkFeatured = readPersistedWetalkFeatured();
    if (persisted) {
      const selectedLocation = getStoredCampusLocation(persisted.locations);
      const locationIndex = Math.max(persisted.locations.indexOf(selectedLocation), 0);
      setStoredCampusLocation(selectedLocation, persisted.locations);
      this.setData({
        banners: persisted.banners,
        locations: persisted.locations,
        locationIndex,
        selectedLocation,
        campusServices: persisted.campusServices,
        employeeServices: persisted.employeeServices,
        pageStatus: 'success',
        wetalkFeatured,
        shareTitle: wetalkFeatured?.title || 'WeTalk E-Magazine',
        shareImage: wetalkFeatured?.image || '',
      });
      (this as unknown as { _lastEntriesLoadedAt?: number })._lastEntriesLoadedAt = Date.now();
    }
    void this.loadEntries(Boolean(persisted));
  },

  onUnload() {
    unbindIdentitySessionRefresh(this);
  },

  onShow() {
    this.setData({ identityBound: hasStoredIdentityBinding() });
    const identityChanged = refreshIfIdentitySessionChanged(this, () => {
      void this.loadEntries();
    });
    const lastLoadedAt =
      (this as unknown as { _lastEntriesLoadedAt?: number })._lastEntriesLoadedAt ?? 0;
    if (
      !identityChanged &&
      this.data.pageStatus === 'success' &&
      Date.now() - lastLoadedAt >= KB_LIFE_REFRESH_INTERVAL_MS
    ) {
      void this.loadEntries();
    }
    if (shouldBlockWetalkForNonEmployee()) {
      this.setData({ wetalkFeatured: null });
    }
    const pendingMap = wx.getStorageSync('kbLifeOpenCampusMap') as string | undefined;
    if (pendingMap) {
      wx.removeStorageSync('kbLifeOpenCampusMap');
      const location = String(pendingMap);
      if (location && !shouldBlockCampusServicesForVisitor()) {
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

  async loadEntries(silent = false) {
    const keepContent =
      silent ||
      (this.data.pageStatus === 'success' &&
        this.data.campusServices.length + this.data.employeeServices.length > 0);
    if (!keepContent) {
      this.setData({ pageStatus: 'loading' });
    }
    try {
      const [result] = await Promise.all([getKbLifeEntries(), this.loadWetalkFeatured()]);
      const selectedLocation = getStoredCampusLocation(result.locations);
      const locationIndex = Math.max(result.locations.indexOf(selectedLocation), 0);
      setStoredCampusLocation(selectedLocation, result.locations);
      (this as unknown as { _lastEntriesLoadedAt?: number })._lastEntriesLoadedAt = Date.now();
      this.setData({
        banners: result.banners.length ? result.banners : this.data.banners,
        locations: result.locations,
        locationIndex,
        selectedLocation,
        campusServices: result.campusServices,
        employeeServices: result.employeeServices,
        pageStatus: 'success',
      });
    } catch (error) {
      if (keepContent) {
        return;
      }
      logPageLoadIssue('kb-life', error);
      this.setData(friendlyUnavailablePageData());
    }
  },

  /** 上层卡片：仅最近 1 个（接口已按 PDF 时间倒序） */
  async loadWetalkFeatured() {
    try {
      const featured = await getWetalkFeatured();
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
    void this.loadEntries();
  },

  showCampusDenied(title = 'Campus Services') {
    openAccessDeniedPage({ kind: 'unbound', title, mode: 'navigate' });
  },

  onGoIdentityBinding() {
    openIdentityBindingInProfile();
  },

  onLifeBannerTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    const banner = this.data.banners.find((item) => item.id === id);
    if (!banner) {
      return;
    }
    if (banner.careId && shouldBlockCampusServicesForVisitor()) {
      openAccessDeniedPage({ kind: 'unbound', title: 'Employee Care', mode: 'navigate' });
      return;
    }
    if (banner.targetUrl?.startsWith('/')) {
      wx.navigateTo({ url: banner.targetUrl });
      return;
    }
    if (banner.careId) {
      wx.navigateTo({
        url: `/subpackages/kb-life/care/index?initiativeId=${encodeURIComponent(banner.careId)}`,
      });
    }
  },

  onCampusTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (isVisitorRestrictedCampusService(id) && shouldBlockCampusServicesForVisitor()) {
      const titles: Record<string, string> = {
        'campus-map': 'Campus Map',
        'shuttle-bus': 'Shuttle Bus',
        cafeteria: 'Canteen',
        holiday: 'Holiday',
      };
      this.showCampusDenied(titles[id || ''] || 'Campus Services');
      return;
    }
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

  /** 先展示阅读器加载态，由阅读器统一获取地图，避免点击前阻塞和重复请求。 */
  openCampusMapReader() {
    if (shouldBlockCampusServicesForVisitor()) {
      this.showCampusDenied();
      return;
    }
    const location = this.data.selectedLocation || getStoredCampusLocation();
    this.setData({
      readerVisible: true,
      readerIssueId: location,
      readerSource: 'campus-map',
      listVisible: false,
      deniedVisible: false,
      shareTitle: 'Campus Map',
      shareImage: '',
    });
  },

  onEmployeeTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (id === 'care' && shouldBlockCampusServicesForVisitor()) {
      openAccessDeniedPage({ kind: 'unbound', title: 'Employee Care', mode: 'navigate' });
      return;
    }
    const target = this.data.employeeServices.find((item) => item.id === id);
    if (target?.path) {
      wx.navigateTo({ url: target.path });
      return;
    }
    this.onComingSoon();
  },

  onWetalkTap() {
    if (shouldBlockWetalkForNonEmployee()) {
      openAccessDeniedPage({ kind: 'employee', title: 'WeTalk', mode: 'navigate' });
      return;
    }
    wx.navigateTo({ url: '/subpackages/kb-life/wetalk/index' });
  },

  onReaderClose() {
    // 阅读器关闭后把导航标题从地图等改回 KB Life
    this.setData({
      readerVisible: false,
      readerIssueId: '',
      readerSource: 'wetalk',
      navTitle: 'KB Life',
    });
  },

  onListBack() {
    this.setData({
      listVisible: false,
      deniedVisible: false,
      deniedKind: '',
      readerVisible: false,
      readerIssueId: '',
      readerSource: 'wetalk',
      navTitle: 'KB Life',
    });
  },

  onComingSoon() {
    wx.showToast({
      title: COMING_SOON_TOAST,
      icon: 'none',
    });
  },
});
