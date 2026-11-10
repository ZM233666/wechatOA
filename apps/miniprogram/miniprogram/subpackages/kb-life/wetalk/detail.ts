import { getWetalkNewsDetail, type WetalkNewsDetailView } from '../../../services/kb-life.service';
import { invalidateRequestCache } from '../../../services/request';
import { RequestError } from '../../../types/api';
import type { ArticleContentBlock } from '../../../types/content';
import { rejectEmployeeOnlyAccess } from '../../../utils/identity-access';

const NATIVE_BLOCK_TYPES = new Set(['carousel', 'video']);

function isPlaceholderArticleHtml(html?: string): boolean {
  if (!html?.trim()) {
    return true;
  }
  const normalized = html.replace(/\s+/g, '').toLowerCase();
  return normalized === '<p>暂无正文</p>';
}

function shouldRenderArticleAsBlocks(
  bodyFormat: 'html' | 'blocks' | undefined,
  blocks: ArticleContentBlock[] | undefined,
  contentHtml?: string,
): boolean {
  if (bodyFormat === 'blocks') {
    return true;
  }
  const list = blocks ?? [];
  if (list.some((block) => NATIVE_BLOCK_TYPES.has(block.type))) {
    return true;
  }
  if (list.length > 0 && isPlaceholderArticleHtml(contentHtml)) {
    return true;
  }
  return false;
}

Page({
  data: {
    article: null as WetalkNewsDetailView | null,
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    articleId: '',
    useBlockBody: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    if (rejectEmployeeOnlyAccess('WeTalk')) {
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
    this.setData({ pageStatus: 'loading', errorText: '', article: null, useBlockBody: false });
    try {
      const article = await getWetalkNewsDetail(id);
      this.setData({
        article,
        pageStatus: 'success',
        useBlockBody: shouldRenderArticleAsBlocks(
          article.bodyFormat,
          article.richContent,
          article.contentHtml,
        ),
      });
    } catch (error) {
      const notFound = error instanceof RequestError && error.statusCode === 404;
      if (notFound) {
        invalidateRequestCache('wetalk:');
      }
      this.setData({
        pageStatus: notFound ? 'empty' : 'error',
        errorText: error instanceof RequestError ? error.message : '文章加载失败',
        article: null,
        useBlockBody: false,
      });
    }
  },
});
