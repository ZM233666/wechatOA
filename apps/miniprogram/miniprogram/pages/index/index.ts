import { getCurrentEnvVersion, getApiBaseUrl } from '../../config/env';
import { getHome } from '../../services/home.service';
import { getHealth } from '../../services/api';
import { RequestError } from '../../types/api';
import type { HomeBanner, NewsSummary, QuickEntry } from '../../types/home';
import { fallbackImageUrl } from '../../utils/format';

const ENTRY_PATHS: Record<string, string> = {
  news: '/pages/news/index',
  brand: '/pages/brand/index',
  product: '/pages/products/index',
  cases: '/pages/cases/index',
};

Page({
  data: {
    banners: [] as HomeBanner[],
    entries: [] as QuickEntry[],
    newsList: [] as NewsSummary[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    pageAlive: true,
    requesting: false,
    showDevTools: false,
    apiBaseUrl: '',
    checking: false,
    statusText: '尚未检查',
    statusType: 'idle' as 'idle' | 'loading' | 'success' | 'error',
  },

  onLoad() {
    const envVersion = getCurrentEnvVersion();
    this.setData({
      pageAlive: true,
      showDevTools: envVersion === 'develop',
      apiBaseUrl: getApiBaseUrl(),
    });
    void this.loadHome();
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  async loadHome() {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    this.data.requesting = true;
    this.setData({ requesting: true, pageStatus: 'loading', errorText: '' });
    try {
      const home = await getHome();
      if (!this.data.pageAlive) {
        return;
      }
      const empty = home.banners.length === 0 && home.entries.length === 0 && home.newsList.length === 0;
      this.setData({
        banners: home.banners,
        entries: home.entries,
        newsList: home.newsList,
        pageStatus: empty ? 'empty' : 'success',
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '首页加载失败',
      });
    } finally {
      if (this.data.pageAlive) {
        this.data.requesting = false;
        this.setData({ requesting: false });
      }
    }
  },

  onRetry() {
    void this.loadHome();
  },

  onBannerImageError(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    this.setData({
      banners: this.data.banners.map((item) =>
        item.id === id ? { ...item, image: fallbackImageUrl(item.image) } : item,
      ),
    });
  },

  onEntryImageError(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    this.setData({
      entries: this.data.entries.map((item) =>
        item.id === id ? { ...item, icon: fallbackImageUrl(item.icon) } : item,
      ),
    });
  },

  onNewsImageError(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    this.setData({
      newsList: this.data.newsList.map((item) =>
        item.id === id ? { ...item, image: fallbackImageUrl(item.image) } : item,
      ),
    });
  },

  onBannerTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    const banner = this.data.banners.find((item) => item.id === id);
    if (!banner) {
      return;
    }
    if (banner.newsId) {
      wx.navigateTo({
        url: `/pages/news/detail?id=${banner.newsId}`,
      });
      return;
    }
    if (banner.targetUrl && banner.targetUrl.startsWith('/pages/')) {
      wx.navigateTo({ url: banner.targetUrl });
    }
  },

  onEntryTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    const path = id ? ENTRY_PATHS[id] : undefined;
    if (!path) {
      return;
    }
    wx.navigateTo({ url: path });
  },

  onNewsTap(event: WechatMiniprogram.TouchEvent) {
    const { id } = event.currentTarget.dataset as { id?: string };
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/news/detail?id=${id}`,
    });
  },

  onNewsMore() {
    wx.navigateTo({
      url: '/pages/news/index',
    });
  },

  async onCheckHealth() {
    if (this.data.checking) {
      return;
    }

    this.setData({
      checking: true,
      statusType: 'loading',
      statusText: '正在检查 Mock API 服务…',
    });

    try {
      const result = await getHealth();
      if (!this.data.pageAlive) {
        return;
      }
      if (result.status === 'ok') {
        this.setData({
          statusType: 'success',
          statusText: result.service ? `${result.service} 连接成功` : '服务连接成功',
        });
        return;
      }

      this.setData({
        statusType: 'error',
        statusText: '服务返回异常',
      });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      const message =
        error instanceof RequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : '检查失败，请确认 Mock Server 已启动';

      this.setData({
        statusType: 'error',
        statusText: message,
      });
    } finally {
      if (this.data.pageAlive) {
        this.setData({
          checking: false,
        });
      }
    }
  },
});
