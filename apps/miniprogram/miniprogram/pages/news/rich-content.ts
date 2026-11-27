import type { ArticleContentBlock } from '../../types/content';

const NATIVE_BLOCK_TYPES = new Set(['carousel', 'video']);

/** CMS 动图仍留在 HTML 里时，必须走 html-content，不能改用只有文字的 blocks。 */
export function contentHtmlHasAnimatedGallery(html?: string): boolean {
  if (!html) {
    return false;
  }
  return /\baa-svg-gallery\b|data-aa-svg-gallery\s*=|\b(?:kb-carousel|kb-media-carousel|wx-svg-carousel)\b|data-kb-block\s*=\s*(['"])(?:carousel|svg-carousel|media-carousel)\1/i.test(
    html,
  );
}

export function isPlaceholderArticleHtml(html?: string): boolean {
  if (!html?.trim()) {
    return true;
  }
  const normalized = html.replace(/\s+/g, '').toLowerCase();
  return normalized === '<p>暂无正文</p>';
}

/** 含轮播 / 视频等 rich-text 无法渲染的块时，应走 article-renderer */
export function shouldRenderArticleAsBlocks(
  bodyFormat: 'html' | 'blocks' | undefined,
  blocks: ArticleContentBlock[] | undefined,
  contentHtml?: string,
): boolean {
  if (contentHtmlHasAnimatedGallery(contentHtml)) {
    return false;
  }
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
