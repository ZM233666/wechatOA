import { COMING_SOON_TOAST } from '../../../constants/routes';
import { getWetalkIssues, type WetalkCover } from '../../../services/kb-life.service';
import { invalidateRequestCache } from '../../../services/request';
import { RequestError } from '../../../types/api';
import { rejectEmployeeOnlyAccess } from '../../../utils/identity-access';

type PageStatus = 'loading' | 'success' | 'empty' | 'error';

function extractYear(date: string): number | null {
  const match = String(date || '').match(/(20\d{2}|19\d{2})/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function sortByDateDesc(items: WetalkCover[]): WetalkCover[] {
  return [...items].sort((a, b) => {
    const ta = Date.parse(a.date) || 0;
    const tb = Date.parse(b.date) || 0;
    if (tb !== ta) {
      return tb - ta;
    }
    return String(b.id).localeCompare(String(a.id));
  });
}

function buildYearOptions(items: WetalkCover[]): string[] {
  const years = new Set<number>();
  items.forEach((item) => {
    const year = extractYear(item.date);
    if (year) {
      years.add(year);
    }
  });
  return ['全部', ...Array.from(years).sort((a, b) => b - a).map(String)];
}

function filterByYear(items: WetalkCover[], yearLabel: string): WetalkCover[] {
  if (!yearLabel || yearLabel === '全部') {
    return items;
  }
  return items.filter((item) => String(extractYear(item.date) || '') === yearLabel);
}

Page({
  data: {
    pageStatus: 'loading' as PageStatus,
    errorText: '',
    allItems: [] as WetalkCover[],
    displayItems: [] as WetalkCover[],
    yearOptions: ['全部'] as string[],
    yearIndex: 0,
    selectedYear: '全部',
    readerVisible: false,
    readerIssueId: '',
    shareTitle: 'WeTalk News',
    shareImage: '',
  },

  onLoad() {
    if (rejectEmployeeOnlyAccess('WeTalk')) {
      return;
    }
    void this.loadList({ force: true });
  },

  onShow() {
    if (rejectEmployeeOnlyAccess('WeTalk')) {
      return;
    }
  },

  onShareAppMessage() {
    return {
      title: this.data.shareTitle || 'WeTalk News',
      path: '/subpackages/kb-life/wetalk/index',
      imageUrl: this.data.shareImage || undefined,
    };
  },

  async loadList(options?: { force?: boolean }) {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      if (options?.force) {
        invalidateRequestCache('wetalk:');
      }
      const items = sortByDateDesc(await getWetalkIssues());
      const yearOptions = buildYearOptions(items);
      const yearIndex = Math.min(this.data.yearIndex, Math.max(yearOptions.length - 1, 0));
      const selectedYear = yearOptions[yearIndex] || '全部';
      const displayItems = filterByYear(items, selectedYear);
      this.setData({
        allItems: items,
        displayItems,
        yearOptions,
        yearIndex,
        selectedYear,
        pageStatus: displayItems.length ? 'success' : 'empty',
        shareTitle: items[0]?.title || 'WeTalk News',
        shareImage: items[0]?.image || '',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : 'WeTalk 列表加载失败',
      });
    }
  },

  onYearChange(event: WechatMiniprogram.PickerChange) {
    const yearIndex = Number(event.detail.value);
    const selectedYear = this.data.yearOptions[yearIndex] || '全部';
    const displayItems = filterByYear(this.data.allItems, selectedYear);
    this.setData({
      yearIndex,
      selectedYear,
      displayItems,
      pageStatus: displayItems.length ? 'success' : 'empty',
    });
  },

  onNewsTap(event: WechatMiniprogram.TouchEvent) {
    const { id, kind } = event.currentTarget.dataset as { id?: string; kind?: string };
    if (!id) {
      return;
    }
    const issue = this.data.allItems.find((item) => item.id === id);
    if (issue) {
      this.setData({
        shareTitle: issue.title || 'WeTalk News',
        shareImage: issue.image || '',
      });
    }
    const contentKind = kind || issue?.kind || 'article';
    // PDF 文稿走页内阅读器；图文走详情页
    if (contentKind === 'pdf' || String(id).startsWith('pdf-')) {
      this.setData({
        readerVisible: true,
        readerIssueId: id,
      });
      return;
    }
    wx.navigateTo({
      url: `/subpackages/kb-life/wetalk/detail?id=${encodeURIComponent(id)}`,
    });
  },

  onReaderClose() {
    this.setData({
      readerVisible: false,
      readerIssueId: '',
    });
  },

  onMagazineReadMore() {
    wx.showToast({
      title: COMING_SOON_TOAST,
      icon: 'none',
    });
  },

  onRetry() {
    void this.loadList({ force: true });
  },
});
