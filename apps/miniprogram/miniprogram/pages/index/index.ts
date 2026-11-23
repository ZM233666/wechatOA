import { getHome, readPersistedHomeView } from '../../services/home.service';
import { prefetchNewsDetails } from '../../services/news.service';
import type { HomeBanner, HomeData, NewsSummary, QuickEntry } from '../../types/home';
import { fallbackImageUrl } from '../../utils/format';
import { friendlyUnavailablePageData } from '../../utils/friendly-page-error';

const ENTRY_PATHS: Record<string, string> = {
  news: '/pages/news/index',
  brand: '/pages/brand/index',
  product: '/pages/products/index',
  cases: '/pages/cases/index',
};

function isMiniProgramPagePath(url: string): boolean {
  return url.startsWith('/pages/') || url.startsWith('/subpackages/');
}

Page({
  data: {
    newsStatus: null as HomeData['newsStatus'] | null,
    banners: [] as HomeBanner[],
    entries: [] as QuickEntry[],
    newsList: [] as NewsSummary[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    pageAlive: true,
    requesting: false,
  },

  onLoad() {
    this.setData({
      pageAlive: true,
    });
    const persisted = readPersistedHomeView();
    if (persisted) {
      const empty =
        persisted.banners.length === 0 &&
        persisted.entries.length === 0 &&
        persisted.newsList.length === 0;
      this.setData({
        newsStatus: persisted.newsStatus,
        banners: persisted.banners,
        entries: persisted.entries,
        newsList: persisted.newsList,
        pageStatus: empty ? 'empty' : 'success',
      });
    }
    void this.loadHome(Boolean(persisted));
  },

  onShow() {
    if (this.data.pageStatus === 'success') {
      void this.loadHome(true);
    }
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  async loadHome(silent = false) {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    this.data.requesting = true;
    const keepContent = silent || this.data.pageStatus === 'success';
    if (!keepContent) {
      this.setData({ requesting: true, pageStatus: 'loading', errorText: '' });
    } else {
      this.setData({ requesting: true, errorText: '' });
    }
    try {
      const home = await getHome();
      if (!this.data.pageAlive) {
        return;
      }
      const empty = home.banners.length === 0 && home.entries.length === 0 && home.newsList.length === 0;
      this.setData({
        newsStatus: home.newsStatus,
        banners: home.banners,
        entries: home.entries,
        newsList: home.newsList,
        pageStatus: empty ? 'empty' : 'success',
      });
      prefetchNewsDetails(home.newsList.slice(0, 3).map((item) => item.id));
    } catch {
      if (!this.data.pageAlive) {
        return;
      }
      if (!keepContent) {
        this.setData({
          pageStatus: 'empty',
          ...friendlyUnavailablePageData(),
        });
      }
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
    if (banner.targetUrl && isMiniProgramPagePath(banner.targetUrl)) {
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
    prefetchNewsDetails([id]);
    wx.navigateTo({
      url: `/pages/news/detail?id=${id}`,
    });
  },

  onNewsMore() {
    wx.navigateTo({
      url: '/pages/news/index',
    });
  },
});
