import { getCampusMap } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';
import { resolveCampusLocation } from '../../../utils/campus-location';

const SCALE_MIN = 0.5;
const SCALE_MAX = 3;
const SCALE_STEP = 0.5;

Page({
  data: {
    location: '',
    title: '园区地图 (Campus Map)',
    image: '',
    scale: 1,
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
    this.setData({ statusBarHeight, navBarHeight });
    void this.loadMap();
  },

  location: '' as string,

  async loadMap() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getCampusMap(this.location);
      this.setData({
        location: result.location,
        title: result.title,
        image: result.image,
        scale: 1,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '园区地图加载失败',
      });
    }
  },

  onBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/kb-life/index' }) });
  },

  onZoomIn() {
    const next = Math.min(Number((this.data.scale + SCALE_STEP).toFixed(1)), SCALE_MAX);
    this.setData({ scale: next });
  },

  onZoomOut() {
    const next = Math.max(Number((this.data.scale - SCALE_STEP).toFixed(1)), SCALE_MIN);
    this.setData({ scale: next });
  },

  onScale(event: WechatMiniprogram.MovableViewScale) {
    const scale = Number(event.detail.scale);
    if (!Number.isFinite(scale)) {
      return;
    }
    this.setData({ scale: Number(scale.toFixed(2)) });
  },

  onDownload() {
    wx.showToast({
      title: '下载中... (Downloading...)',
      icon: 'none',
    });
  },
});
