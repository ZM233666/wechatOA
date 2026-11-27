import { getEmployeeCareDetail, type EmployeeCareArticleDetailView } from '../../../services/kb-life.service';
import { invalidateRequestCache } from '../../../services/request';
import { RequestError } from '../../../types/api';
import { handleIdentityAccessFailure, rejectUnboundIdentityAccess } from '../../../utils/identity-access';
import { friendlyUnavailablePageData, logPageLoadIssue } from '../../../utils/friendly-page-error';

Page({
  data: {
    article: null as EmployeeCareArticleDetailView | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    articleId: '',
  },

  onLoad(query: Record<string, string | undefined>) {
    if (rejectUnboundIdentityAccess('/pages/kb-life/index', 'Employee Care')) {
      return;
    }
    const id = (query.id ?? '').trim();
    if (!id) {
      this.setData({ pageStatus: 'empty' });
      return;
    }
    this.setData({ articleId: id });
    void this.loadArticle(id);
  },

  onRetry() {
    if (this.data.articleId) {
      void this.loadArticle(this.data.articleId);
    }
  },

  async loadArticle(id: string) {
    this.setData({ pageStatus: 'loading', errorText: '', article: null });
    try {
      const article = await getEmployeeCareDetail(id);
      this.setData({
        article,
        pageStatus: 'success',
      });
    } catch (error) {
      const notFound = error instanceof RequestError && error.statusCode === 404;
      if (notFound) {
        invalidateRequestCache('kb-life:entries');
      }
      logPageLoadIssue('care-detail', error);
      if (handleIdentityAccessFailure(error, { title: 'Employee Care' })) {
        return;
      }
      this.setData({
        ...friendlyUnavailablePageData(),
        article: null,
      });
    }
  },
});
