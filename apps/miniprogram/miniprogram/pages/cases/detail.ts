import { getCaseDetail, peekCaseDetail, type ProjectCaseView } from './cases.service';
import { fallbackImageUrl } from '../../utils/format';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../utils/friendly-page-error';

Page({
  data: {
    caseId: '',
    item: null as ProjectCaseView | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    pageAlive: true,
    requesting: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ pageAlive: true, caseId: query.id ?? '' });
    void this.loadDetail();
  },

  onUnload() {
    this.data.pageAlive = false;
  },

  async loadDetail(force = false) {
    if (!this.data.pageAlive || this.data.requesting) {
      return;
    }
    const id = this.data.caseId;
    if (!id) {
      this.setData({ pageStatus: 'empty', item: null });
      return;
    }
    const cached = force ? null : peekCaseDetail(id);
    if (cached) {
      this.setData({ item: cached, pageStatus: 'success', requesting: false, errorText: '' });
      return;
    }
    const keepContent = Boolean(this.data.item);
    this.data.requesting = true;
    this.setData(keepContent ? { requesting: true, errorText: '' } : { requesting: true, pageStatus: 'loading', errorText: '' });
    try {
      const item = await getCaseDetail(id);
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      this.setData({ item, pageStatus: 'success', requesting: false });
    } catch (error) {
      if (!this.data.pageAlive) {
        return;
      }
      this.data.requesting = false;
      logPageLoadIssue('case-detail', error);
      if (this.data.item) {
        this.setData({ requesting: false });
        return;
      }
      this.setData({
        item: null,
        requesting: false,
        ...friendlyUnavailablePageData(),
      });
    }
  },

  onRetry() {
    void this.loadDetail(true);
  },

  onCoverImageError() {
    if (!this.data.item) {
      return;
    }
    this.setData({
      item: {
        ...this.data.item,
        image: fallbackImageUrl(this.data.item.image),
      },
    });
  },
});
