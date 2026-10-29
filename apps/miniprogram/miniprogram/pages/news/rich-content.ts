import type { ArticleContentBlock } from '../../types/content';

const NATIVE_BLOCK_TYPES = new Set(['carousel', 'video']);

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
