import {
  filterShuttleRoutes,
  getShuttle,
  planShuttleTrip,
  type ShuttleMapRouteLine,
  type ShuttleRoute,
  type ShuttleTripPlanResult,
} from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';
import { resolveCampusLocation } from '../../../utils/campus-location';
import {
  buildShuttleMapView,
  type ShuttleMapLegendItem,
  type ShuttleMapMarkerView,
  type ShuttleMapPolylineView,
  type ShuttleMapStopDetail,
} from '../../../utils/shuttle-map';

Page({
  data: {
    location: '',
    keyword: '',
    routes: [] as ShuttleRoute[],
    allRoutes: [] as ShuttleRoute[],
    notice: '',
    viewMode: 'schedule' as 'schedule' | 'map',
    mapTitle: '',
    mapRoutes: [] as ShuttleMapRouteLine[],
    mapRouteOptions: [] as Array<{ id: string; name: string }>,
    selectedMapRouteId: 'all',
    mapCenter: { latitude: 31.29834, longitude: 120.58529 },
    mapScale: 12,
    mapMarkers: [] as ShuttleMapMarkerView[],
    mapPolyline: [] as ShuttleMapPolylineView[],
    mapLegend: [] as ShuttleMapLegendItem[],
    mapStopDetail: null as ShuttleMapStopDetail | null,
    tripDestination: '',
    tripPlanStatus: 'idle' as 'idle' | 'loading' | 'success' | 'error',
    tripPlanError: '',
    tripPlanResult: null as ShuttleTripPlanResult | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'error',
    errorText: '',
    statusBarHeight: 20,
    navBarHeight: 44,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.location = resolveCampusLocation(query.location);
    const windowInfo = wx.getWindowInfo();
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = windowInfo.statusBarHeight || 20;
    const gap = Math.max(menuButton.top - statusBarHeight, 4);
    const navBarHeight = menuButton.height + gap * 2;
    const initialView = query.view === 'map' ? 'map' : 'schedule';
    this.setData({
      statusBarHeight,
      navBarHeight,
      location: this.location,
      viewMode: initialView,
    });
    void this.loadShuttle();
  },

  location: '' as string,

  async loadShuttle() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getShuttle(this.location);
      const map = result.map;
      const mapRoutes = map?.routes ?? [];
      const mapRouteOptions = [
        { id: 'all', name: '全部线路 All Routes' },
        ...mapRoutes.map((route) => ({ id: route.id, name: route.name })),
      ];
      this.setData({
        location: result.location,
        notice: result.notice,
        allRoutes: result.routes,
        routes: filterShuttleRoutes(result.routes, this.data.keyword),
        mapTitle: map?.title || `Shuttle Map · ${result.location}`,
        mapRoutes,
        mapRouteOptions,
        selectedMapRouteId: 'all',
        mapCenter: map?.center ?? { latitude: 31.29834, longitude: 120.58529 },
        pageStatus: 'success',
      });
      this.refreshMapOverlay();
      if (this.data.viewMode === 'map') {
        this.openMapView();
      }
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '班车信息加载失败',
      });
    }
  },

  async refreshMapOverlay() {
    const payload = await buildShuttleMapView(
      this.data.mapRoutes,
      this.data.selectedMapRouteId,
      this.data.mapCenter,
    );
    this.setData({
      mapCenter: payload.center,
      mapScale: payload.scale,
      mapMarkers: payload.markers,
      mapPolyline: payload.polyline,
      mapLegend: payload.legend,
      mapStopDetail: null,
    });
  },

  onSearchInput(event: WechatMiniprogram.Input) {
    const keyword = event.detail.value;
    this.setData({
      keyword,
      routes: filterShuttleRoutes(this.data.allRoutes, keyword),
    });
  },

  onSwitchSchedule() {
    this.setData({ viewMode: 'schedule' });
  },

  onSwitchMap() {
    this.setData({ viewMode: 'map' });
    this.openMapView();
  },

  openMapView() {
    this.refreshMapOverlay();
  },

  onMapBack() {
    this.setData({ viewMode: 'schedule' });
  },

  onMapRoutePick(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    const option = this.data.mapRouteOptions[index];
    if (!option) {
      return;
    }
    this.setData({ selectedMapRouteId: option.id });
    this.refreshMapOverlay();
  },

  onMapMarkerTap(event: WechatMiniprogram.CustomEvent<{ markerId: number }>) {
    const markerId = Number(event.detail.markerId);
    const marker = this.data.mapMarkers.find((item) => item.id === markerId);
    if (!marker) {
      return;
    }
    this.setData({
      mapStopDetail: {
        routeName: marker.routeName,
        stopName: marker.stopName,
        timesText: marker.timesText,
      },
    });
  },

  onMapStopDetailClose() {
    this.setData({ mapStopDetail: null });
  },

  onTripDestinationInput(event: WechatMiniprogram.Input) {
    this.setData({ tripDestination: event.detail.value });
  },

  onChooseTripDestination() {
    wx.chooseLocation({
      success: (result) => {
        const name = result.name || result.address || '已选位置';
        this.setData({ tripDestination: name });
        void this.runTripPlan({
          latitude: result.latitude,
          longitude: result.longitude,
          name,
        });
      },
      fail: () => {
        wx.showToast({ title: '未选择位置', icon: 'none' });
      },
    });
  },

  onTripPlanSearch() {
    void this.runTripPlan();
  },

  async runTripPlan(coords?: { latitude: number; longitude: number; name?: string }) {
    const destination = this.data.tripDestination.trim();
    if (!destination && !coords) {
      wx.showToast({ title: '请输入或选择目的地', icon: 'none' });
      return;
    }
    this.setData({ tripPlanStatus: 'loading', tripPlanError: '', tripPlanResult: null });
    try {
      const result = await planShuttleTrip(destination, this.location, coords);
      this.setData({
        tripPlanStatus: 'success',
        tripPlanResult: result,
        mapCenter: {
          latitude: result.destination.latitude,
          longitude: result.destination.longitude,
        },
      });
    } catch (error) {
      this.setData({
        tripPlanStatus: 'error',
        tripPlanError: error instanceof RequestError ? error.message : '路线规划失败',
      });
    }
  },

  onTripPlanClose() {
    this.setData({ tripPlanResult: null, tripPlanStatus: 'idle', tripPlanError: '' });
  },
});
