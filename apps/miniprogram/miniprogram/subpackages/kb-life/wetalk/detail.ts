import { getWetalkDetail, type WetalkItem } from '../../../services/wetalk.service';
import { handleIdentityAccessFailure, rejectEmployeeOnlyAccess } from '../../../utils/identity-access';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../utils/friendly-page-error';

Page({
  data: { article: null as WetalkItem | null, articleId: '', readerVisible: false, readerIssueId: '',
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error', errorText: '' },
  onLoad(query: Record<string, string | undefined>) {
    if (rejectEmployeeOnlyAccess('WeTalk')) return;
    const id = (query.id || '').trim();
    this.setData({ articleId: id });
    if (!id) { this.setData({ pageStatus: 'empty' }); return; }
    void this.loadArticle(id);
  },
  onShow() {
    if (rejectEmployeeOnlyAccess('WeTalk')) return;
    if (this.data.articleId && this.data.pageStatus !== 'loading') void this.loadArticle(this.data.articleId);
  },
  onRetry() { void this.loadArticle(this.data.articleId); },
  async loadArticle(id: string) {
    this.setData({ pageStatus: 'loading', errorText: '', article: null });
    try {
      const article = await getWetalkDetail('news', id);
      this.setData({ article, pageStatus: 'success' });
    } catch (error) {
      logPageLoadIssue('wetalk-detail', error);
      if (handleIdentityAccessFailure(error, { kind: 'employee', title: 'WeTalk' })) {
        return;
      }
      this.setData(friendlyUnavailablePageData());
    }
  },
  onOpenPdf() {
    this.setData({ readerVisible: true, readerIssueId: `news:${this.data.articleId}` });
  },
  onReaderClose() { this.setData({ readerVisible: false, readerIssueId: '' }); },

});
