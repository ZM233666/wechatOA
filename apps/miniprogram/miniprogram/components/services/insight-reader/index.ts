import {
  getInsightReport,
  type InsightReportPageView,
  type InsightReportView,
} from '../../../services/services.service';
import { getWetalkIssueAsReport } from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';

function withThumbLabels(pages: InsightReportPageView[]) {
  return pages.map((page, index) => ({
    ...page,
    thumbLabel: index === 0 ? 'COVER' : String(index),
  }));
}

function measureReaderHeight(): number {
  const windowInfo = wx.getWindowInfo();
  const menuButton = wx.getMenuButtonBoundingClientRect();
  const statusBarHeight = windowInfo.statusBarHeight || 20;
  const gap = Math.max(menuButton.top - statusBarHeight, 4);
  const navBarHeight = menuButton.height + gap * 2;
  const headerHeight = statusBarHeight + navBarHeight;
  // Tab 页 windowHeight 已不含原生 TabBar，不要再额外扣减，否则底部会留白
  return Math.max(Math.floor(windowInfo.windowHeight - headerHeight), 320);
}

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    reportId: {
      type: String,
      value: '',
    },
    /** insights | wetalk */
    source: {
      type: String,
      value: 'insights',
    },
    withTabBar: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    report: null as InsightReportView | null,
    pages: [] as Array<InsightReportPageView & { thumbLabel: string }>,
    current: 0,
    canPrev: false,
    canNext: false,
    pageStatus: 'idle' as 'idle' | 'loading' | 'success' | 'error',
    errorText: '',
    shareTitle: '',
    shareImage: '',
    readerHeight: 0,
  },

  lifetimes: {
    attached() {
      this.refreshLayout();
    },
  },

  observers: {
    'visible, reportId, source'(visible: boolean, reportId: string) {
      if (visible) {
        this.refreshLayout();
      }
      if (visible && reportId) {
        void this.loadReport(reportId);
        return;
      }
      if (!visible) {
        this.setData({
          report: null,
          pages: [],
          current: 0,
          canPrev: false,
          canNext: false,
          pageStatus: 'idle',
          errorText: '',
        });
      }
    },
  },

  methods: {
    refreshLayout() {
      this.setData({ readerHeight: measureReaderHeight() });
    },

    async loadReport(id: string) {
      this.refreshLayout();
      this.setData({ pageStatus: 'loading', errorText: '', current: 0 });
      try {
        const report =
          this.properties.source === 'wetalk'
            ? await getWetalkIssueAsReport(id)
            : await getInsightReport(id);
        const pages = withThumbLabels(report.pages);
        this.setData({
          report,
          pages,
          current: 0,
          canPrev: false,
          canNext: pages.length > 1,
          pageStatus: 'success',
          shareTitle: report.title,
          shareImage: report.image,
        });
      } catch (error) {
        this.setData({
          pageStatus: 'error',
          errorText: error instanceof RequestError ? error.message : '报告加载失败',
        });
      }
    },

    syncNav(current: number) {
      const total = this.data.pages.length;
      this.setData({
        current,
        canPrev: current > 0,
        canNext: current < total - 1,
      });
    },

    onSwiperChange(event: WechatMiniprogram.SwiperChange) {
      this.syncNav(Number(event.detail.current) || 0);
    },

    onThumbTap(event: WechatMiniprogram.TouchEvent) {
      const { index } = event.currentTarget.dataset as { index?: number };
      if (typeof index !== 'number') {
        return;
      }
      this.syncNav(index);
    },

    onPrev() {
      if (!this.data.canPrev) {
        return;
      }
      this.syncNav(this.data.current - 1);
    },

    onNext() {
      if (!this.data.canNext) {
        return;
      }
      this.syncNav(this.data.current + 1);
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
