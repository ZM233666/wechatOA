import {
  getInsightReport,
  type InsightReportPageView,
  type InsightReportView,
} from '../../../services/services.service';
import { getCampusMapAsReport, getWetalkIssueAsReport } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';

type ReaderPage = InsightReportPageView & { thumbLabel: string };

function withThumbLabels(pages: InsightReportPageView[]): ReaderPage[] {
  return pages.map((page, index) => ({
    ...page,
    thumbLabel: index === 0 ? 'COVER' : String(index),
  }));
}

function getNavHeaderHeight(): number {
  const windowInfo = wx.getWindowInfo();
  const menuButton = wx.getMenuButtonBoundingClientRect();
  const statusBarHeight = windowInfo.statusBarHeight || 20;
  const gap = Math.max(menuButton.top - statusBarHeight, 4);
  const navBarHeight = menuButton.height + gap * 2;
  return statusBarHeight + navBarHeight;
}

/** 与 app-tab-bar placeholder：100rpx + safe-area-inset-bottom 对齐 */
function getTabBarHeight(): number {
  const windowInfo = wx.getWindowInfo();
  const tabBarRpx = 100;
  const tabBarPx = (tabBarRpx / 750) * windowInfo.windowWidth;
  const safeBottom = Math.max(
    (windowInfo.screenHeight || windowInfo.windowHeight) -
      (windowInfo.safeArea?.bottom || windowInfo.windowHeight),
    0,
  );
  return tabBarPx + safeBottom;
}

function measureReaderHeight(options: {
  fullWindow?: boolean;
  hasNavBar?: boolean;
  hasTabBar?: boolean;
} = {}): number {
  const windowInfo = wx.getWindowInfo();
  if (options.fullWindow) {
    return Math.max(Math.floor(windowInfo.windowHeight), 320);
  }
  let height = windowInfo.windowHeight;
  if (options.hasNavBar) {
    height -= getNavHeaderHeight();
  }
  if (options.hasTabBar) {
    height -= getTabBarHeight();
  }
  return Math.max(Math.floor(height), 320);
}

const FLIP_SETTLE_MS = 280;

Component({
  options: {
    // 让根节点直接参与父级 flex，页码栏才能贴底
    virtualHost: true,
  },

  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    reportId: {
      type: String,
      value: '',
    },
    /** insights | wetalk | campus-map */
    source: {
      type: String,
      value: 'insights',
    },
    /**
     * 仅自定义 app-tab-bar 占位时传 true。
     * 原生 tabBar 页的 windowHeight 已不含底栏，勿再传 true，否则会出现黑色空档。
     */
    withTabBar: {
      type: Boolean,
      value: false,
    },
    /** 上方是否还有 nav-brand 占位；阅读态隐藏导航时传 false */
    hasNavBar: {
      type: Boolean,
      value: true,
    },
    /** 由父级 flex 撑满剩余高度（推荐），避免像素高度与底栏错位 */
    fillParent: {
      type: Boolean,
      value: true,
    },
  },

  data: {
    report: null as InsightReportView | null,
    pages: [] as ReaderPage[],
    current: 0,
    canPrev: false,
    canNext: false,
    pageStatus: 'idle' as 'idle' | 'loading' | 'success' | 'error',
    errorText: '',
    shareTitle: '',
    shareImage: '',
    readerHeight: 0,
    /** 与 nav-brand 同高，内容从标题栏下沿开始 */
    headerInset: 64,
    /** 关闭/分享与胶囊垂直居中对齐 */
    chromeTop: 12,
    isMapMode: false,
    isBookMode: false,
    hideDock: false,
    currentPage: null as ReaderPage | null,
    underPage: null as ReaderPage | null,
    flipping: false,
    flipDirection: '' as '' | 'next' | 'prev',
    bookEntered: false,
    bookGesture: {
      canPrev: false,
      canNext: false,
      resetToken: 0,
    },
  },

  lifetimes: {
    attached() {
      this.refreshLayout();
    },
  },

  observers: {
    // 不要把会在 refreshLayout/loadReport 里 setData 的字段放进依赖，否则会死循环卡死模拟器
    'visible, reportId, source'(visible: boolean, reportId: string) {
      if (!visible) {
        (this as WechatMiniprogram.Component.TrivialInstance & { _loadingReportId?: string })._loadingReportId =
          '';
        this.setData({
          flipping: false,
          flipDirection: '',
          bookEntered: false,
        });
        return;
      }
      this.refreshLayout();
      if (!reportId) {
        return;
      }
      const self = this as WechatMiniprogram.Component.TrivialInstance & {
        _loadingReportId?: string;
      };
      if (this.data.report?.id === reportId && this.data.pageStatus === 'success') {
        return;
      }
      if (self._loadingReportId === reportId) {
        return;
      }
      void this.loadReport(reportId);
    },
  },

  methods: {
    refreshLayout() {
      const isMapMode = this.properties.source === 'campus-map';
      const isBookMode = this.properties.source === 'wetalk' || this.properties.source === 'insights';
      const withTabBar = Boolean(this.properties.withTabBar);
      const hasNavBar = Boolean(this.properties.hasNavBar);
      const fillParent = this.properties.fillParent !== false;
      const fullWindow = isMapMode && !withTabBar && !hasNavBar;
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const headerInset = getNavHeaderHeight();
      // 无外部 nav 时：按钮与胶囊垂直居中；有 nav 时贴在内容区顶部
      const btnSize = 32;
      const chromeTop = !hasNavBar
        ? Math.max(Math.round(menuButton.top + (menuButton.height - btnSize) / 2), 8)
        : 12;
      const next = {
        readerHeight: fillParent
          ? 0
          : measureReaderHeight({
              fullWindow,
              hasNavBar: fullWindow ? false : hasNavBar,
              hasTabBar: withTabBar,
            }),
        headerInset,
        chromeTop,
        isMapMode,
        isBookMode,
      };
      // 值未变则跳过，减少无意义 setData
      if (
        this.data.readerHeight === next.readerHeight &&
        this.data.headerInset === next.headerInset &&
        this.data.chromeTop === next.chromeTop &&
        this.data.isMapMode === next.isMapMode &&
        this.data.isBookMode === next.isBookMode
      ) {
        return;
      }
      this.setData(next);
    },

    async loadReport(id: string) {
      const self = this as WechatMiniprogram.Component.TrivialInstance & {
        _loadingReportId?: string;
      };
      self._loadingReportId = id;
      this.setData({
        pageStatus: 'loading',
        errorText: '',
        current: 0,
        flipping: false,
        flipDirection: '',
        bookEntered: false,
      });
      this.refreshLayout();
      try {
        const report =
          this.properties.source === 'wetalk'
            ? await getWetalkIssueAsReport(id)
            : this.properties.source === 'campus-map'
              ? await getCampusMapAsReport(id)
              : await getInsightReport(id);

        // 若期间切换了报告，丢弃过期结果
        if (self._loadingReportId !== id) {
          return;
        }

        const isMapMode = this.properties.source === 'campus-map';
        const isBookMode = this.properties.source === 'wetalk' || this.properties.source === 'insights';
        const pages = withThumbLabels(report.pages).map((page, index) => ({
          ...page,
          thumbLabel: isMapMode
            ? report.pages.length <= 1
              ? 'MAP'
              : String(index + 1)
            : page.thumbLabel,
        }));
        if (!pages.length) {
          self._loadingReportId = '';
          this.setData({
            pageStatus: 'error',
            errorText: '暂无内容',
          });
          return;
        }

        const canNext = pages.length > 1;
        this.setData(
          {
            report,
            pages,
            current: 0,
            canPrev: false,
            canNext,
            pageStatus: 'success',
            shareTitle: report.title,
            shareImage: report.image,
            isMapMode,
            isBookMode,
            hideDock: isMapMode && pages.length <= 1,
            currentPage: pages[0],
            underPage: pages[1] || pages[0],
            flipping: false,
            flipDirection: '',
            bookEntered: false,
            bookGesture: {
              canPrev: false,
              canNext,
              resetToken: 1,
            },
          },
          () => {
            self._loadingReportId = '';
            if (isBookMode) {
              setTimeout(() => this.setData({ bookEntered: true }), 20);
            }
          },
        );
      } catch (error) {
        if (self._loadingReportId === id) {
          self._loadingReportId = '';
        }
        this.setData({
          pageStatus: 'error',
          errorText: error instanceof RequestError ? error.message : '报告加载失败',
        });
      }
    },

    syncNav(current: number) {
      const total = this.data.pages.length;
      const safe = Math.max(0, Math.min(current, total - 1));
      const currentPage = this.data.pages[safe] || null;
      const underPage =
        this.data.pages[Math.min(safe + 1, total - 1)] || currentPage;
      const canPrev = safe > 0;
      const canNext = safe < total - 1;
      this.setData({
        current: safe,
        canPrev,
        canNext,
        currentPage,
        underPage,
        flipping: false,
        flipDirection: '',
        bookGesture: {
          canPrev,
          canNext,
          resetToken: (this.data.bookGesture?.resetToken || 0) + 1,
        },
      });
    },

    onSwiperChange(event: WechatMiniprogram.SwiperChange) {
      this.syncNav(Number(event.detail.current) || 0);
    },

    onThumbTap(event: WechatMiniprogram.TouchEvent) {
      const { index } = event.currentTarget.dataset as { index?: number };
      if (typeof index !== 'number' || this.data.flipping) {
        return;
      }
      if (this.data.isBookMode) {
        const delta = index - this.data.current;
        if (delta === 0) {
          return;
        }
        void this.playFlip(delta > 0 ? 'next' : 'prev', index);
        return;
      }
      this.syncNav(index);
    },

    onPrev() {
      if (!this.data.canPrev || this.data.flipping) {
        return;
      }
      if (this.data.isBookMode) {
        void this.playFlip('prev');
        return;
      }
      this.syncNav(this.data.current - 1);
    },

    onNext() {
      if (!this.data.canNext || this.data.flipping) {
        return;
      }
      if (this.data.isBookMode) {
        void this.playFlip('next');
        return;
      }
      this.syncNav(this.data.current + 1);
    },

    /** 方向锁定：只换底页一次 */
    onBookDirLock(payload: { direction?: string }) {
      if (this.data.flipping) {
        return;
      }
      const direction = payload?.direction === 'prev' ? 'prev' : 'next';
      const idx =
        direction === 'next' ? this.data.current + 1 : this.data.current - 1;
      const underPage = this.data.pages[idx] || this.data.currentPage;
      if (this.data.flipDirection === direction && this.data.underPage === underPage) {
        return;
      }
      this.setData({
        flipDirection: direction,
        underPage,
      });
    },

    onBookFlipCancel() {
      if (this.data.flipping) {
        return;
      }
      this.setData({
        flipDirection: '',
        underPage:
          this.data.pages[Math.min(this.data.current + 1, this.data.pages.length - 1)] ||
          this.data.currentPage,
      });
    },

    onBookFlipCommit(payload: { direction?: string }) {
      const direction = payload?.direction === 'prev' ? 'prev' : 'next';
      const target =
        direction === 'next' ? this.data.current + 1 : this.data.current - 1;
      void this.settleFlip(target);
    },

    async playFlip(direction: 'next' | 'prev', targetIndex?: number) {
      if (this.data.flipping) {
        return;
      }
      const nextIndex =
        typeof targetIndex === 'number'
          ? targetIndex
          : direction === 'next'
            ? this.data.current + 1
            : this.data.current - 1;
      if (nextIndex < 0 || nextIndex >= this.data.pages.length) {
        return;
      }

      this.setData({
        flipping: true,
        flipDirection: direction,
        underPage: this.data.pages[nextIndex],
      });
      await new Promise((resolve) => setTimeout(resolve, FLIP_SETTLE_MS));
      this.syncNav(nextIndex);
    },

    async settleFlip(targetIndex: number) {
      if (targetIndex < 0 || targetIndex >= this.data.pages.length) {
        this.setData({
          flipping: false,
          flipDirection: '',
          bookGesture: {
            canPrev: this.data.canPrev,
            canNext: this.data.canNext,
            resetToken: (this.data.bookGesture?.resetToken || 0) + 1,
          },
        });
        return;
      }
      this.setData({ flipping: true });
      await new Promise((resolve) => setTimeout(resolve, FLIP_SETTLE_MS));
      this.syncNav(targetIndex);
    },

    onClose() {
      this.triggerEvent('close');
    },

    onSave() {
      wx.showToast({
        title: '已保存',
        icon: 'none',
      });
    },
  },
});
