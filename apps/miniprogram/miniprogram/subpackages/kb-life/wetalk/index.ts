import { getWetalkIssues, getWetalkMagazines, type WetalkCover } from '../../../services/wetalk.service';
import { handleIdentityAccessFailure, rejectEmployeeOnlyAccess } from '../../../utils/identity-access';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../utils/friendly-page-error';

type PageStatus = 'loading' | 'success' | 'empty' | 'error';
type WetalkListItem = WetalkCover & { listKey: string };

function withListKey(items: WetalkCover[]): WetalkListItem[] {
  return items.map((item) => ({ ...item, listKey: `${item.type}:${item.id}` }));
}

function extractYear(date: string): number | null {
  const match = String(date || '').match(/(20\d{2}|19\d{2})/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function sortByDateDesc(items: WetalkCover[]): WetalkCover[] {
  return items.slice().sort((a, b) => {
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
  return ['All'].concat(Array.from(years).sort((a, b) => b - a).map(String));
}

function filterByYear<T extends WetalkCover>(items: T[], yearLabel: string): T[] {
  if (!yearLabel || yearLabel === 'All') {
    return items;
  }
  return items.filter((item) => String(extractYear(item.date) || '') === yearLabel);
}

Page({
  data: {
    pageStatus: 'loading' as PageStatus,
    readerVisible: false, readerIssueId: '',
    errorText: '',
    allItems: [] as WetalkListItem[],
    displayItems: [] as WetalkListItem[],
    yearOptions: ['All'] as string[],
    yearIndex: 0,
    selectedYear: 'All',
    shareTitle: 'WeTalk News',
    shareImage: '',
  },

  onLoad() {
    if (rejectEmployeeOnlyAccess('WeTalk')) {
      return;
    }
    void this.loadList();
  },

  onShow() {
    if (rejectEmployeeOnlyAccess('WeTalk')) {
      return;
    }
    // Returning from a detail/PDF view refreshes potentially expired cover URLs.
    if (this.data.pageStatus !== 'loading') void this.loadList(true);
  },

  onShareAppMessage() {
    return {
      title: this.data.shareTitle || 'WeTalk News',
      path: '/subpackages/kb-life/wetalk/index',
      imageUrl: this.data.shareImage || undefined,
    };
  },

  async loadList(silent = false) {
    const keepContent =
      silent && this.data.pageStatus === 'success' && this.data.allItems.length > 0;
    if (!keepContent) {
      this.setData({ pageStatus: 'loading', errorText: '' });
    }
    try {
      const [news, magazines] = await Promise.all([getWetalkIssues(), getWetalkMagazines()]);
      const items = withListKey(sortByDateDesc(news.concat(magazines)));
      const yearOptions = buildYearOptions(items);
      const yearIndex = Math.min(this.data.yearIndex, Math.max(yearOptions.length - 1, 0));
      const selectedYear = yearOptions[yearIndex] || 'All';
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
      if (keepContent) {
        return;
      }
      logPageLoadIssue('wetalk', error);
      if (handleIdentityAccessFailure(error, { kind: 'employee', title: 'WeTalk' })) {
        return;
      }
      this.setData(friendlyUnavailablePageData());
    }
  },

  onYearChange(event: WechatMiniprogram.PickerChange) {
    const yearIndex = Number(event.detail.value);
    const selectedYear = this.data.yearOptions[yearIndex] || 'All';
    const displayItems = filterByYear(this.data.allItems, selectedYear);
    this.setData({
      yearIndex,
      selectedYear,
      displayItems,
      pageStatus: displayItems.length ? 'success' : 'empty',
    });
  },

  onNewsTap(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    const type = String(event.currentTarget.dataset.type || 'news');
    if (!id) return;
    const item = this.data.allItems.find(value => value.id === id && value.type === type);
    if (item?.type === 'emagazine' || item?.kind === 'pdf') {
      const readerType = item.type === 'emagazine' ? 'emagazine' : 'news';
      this.setData({ readerVisible: true, readerIssueId: `${readerType}:${id}` });
      return;
    }
    wx.navigateTo({ url: `/subpackages/kb-life/wetalk/detail?id=${encodeURIComponent(id)}` });
  },

  onReaderClose() { this.setData({ readerVisible: false, readerIssueId: '' }); },

  onRetry() {
    void this.loadList();
  },
});
