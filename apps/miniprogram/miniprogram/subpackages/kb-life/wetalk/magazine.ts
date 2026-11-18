import {
  getWetalkMagazines,
  type WetalkCover,
} from '../../../services/wetalk.service';
import { rejectEmployeeOnlyAccess } from '../../../utils/identity-access';
import { friendlyUnavailablePageData } from '../../../utils/friendly-page-error';

type PageStatus = 'loading' | 'success' | 'empty' | 'error';

export interface MagazineCardView extends WetalkCover {
  issueLabel: string;
  column: 'left' | 'right';
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

function buildIssueLabel(item: WetalkCover, index: number, total: number): string {
  const volume = String(item.volumeNo || '').trim();
  if (volume) {
    return volume.toUpperCase().startsWith('VOL') || volume.toUpperCase().startsWith('NO')
      ? volume
      : `Vol. ${volume}`;
  }
  const yearMatch = String(item.date || '').match(/(20\d{2}|19\d{2})/);
  const year = yearMatch ? yearMatch[1] : '';
  const seq = String(total - index).padStart(2, '0');
  return year ? `Issue ${year} · ${seq}` : `Issue ${seq}`;
}

function toMagazineCards(items: WetalkCover[]): MagazineCardView[] {
  const sorted = sortByDateDesc(items);
  return sorted.map((item, index) => ({
    ...item,
    issueLabel: buildIssueLabel(item, index, sorted.length),
    column: index % 2 === 0 ? 'left' : 'right',
  }));
}

Page({
  data: {
    pageStatus: 'loading' as PageStatus,
    readerVisible: false, readerIssueId: '',
    errorText: '',
    items: [] as MagazineCardView[],
    leftItems: [] as MagazineCardView[],
    rightItems: [] as MagazineCardView[],
    shareTitle: 'WeTalk Magazine',
    shareImage: '',
  },

  onLoad() {
    if (rejectEmployeeOnlyAccess('WeTalk Magazine')) {
      return;
    }
    void this.loadList();
  },

  onShow() {
    if (rejectEmployeeOnlyAccess('WeTalk Magazine')) {
      return;
    }
    // Returning from a detail/PDF view refreshes potentially expired cover URLs.
    if (this.data.pageStatus !== 'loading') void this.loadList(true);
  },

  onShareAppMessage() {
    return {
      title: this.data.shareTitle || 'WeTalk Magazine',
      path: '/subpackages/kb-life/wetalk/magazine',
      imageUrl: this.data.shareImage || undefined,
    };
  },

  async loadList(silent = false) {
    const keepContent = silent && this.data.pageStatus === 'success' && this.data.items.length > 0;
    if (!keepContent) {
      this.setData({ pageStatus: 'loading', errorText: '' });
    }
    try {
      const magazines = await getWetalkMagazines();
      const items = toMagazineCards(magazines);
      const leftItems = items.filter((item) => item.column === 'left');
      const rightItems = items.filter((item) => item.column === 'right');
      this.setData({
        items,
        leftItems,
        rightItems,
        pageStatus: items.length ? 'success' : 'empty',
        shareTitle: items[0]?.title || 'WeTalk Magazine',
        shareImage: items[0]?.image || '',
      });
    } catch {
      if (keepContent) {
        return;
      }
      this.setData({
        pageStatus: 'empty',
        ...friendlyUnavailablePageData(),
      });
    }
  },

  onMagazineTap(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (id) this.setData({ readerVisible: true, readerIssueId: `emagazine:${id}` });
  },
  onReaderClose() { this.setData({ readerVisible: false, readerIssueId: '' }); },

  onRetry() {
    void this.loadList();
  },
});
