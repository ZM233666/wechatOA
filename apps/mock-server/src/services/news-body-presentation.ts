import type { ArticleContentBlock } from '@app/shared';

export function isPlaceholderArticleHtml(html?: string | null): boolean {
  if (!html?.trim()) {
    return true;
  }
  const normalized = html.replace(/\s+/g, '').toLowerCase();
  return normalized === '<p>暂无正文</p>';
}

export function richContentHasNativeMedia(blocks: ArticleContentBlock[]): boolean {
  return blocks.some((block) => block.type === 'carousel' || block.type === 'video');
}

/** 结构化正文可独立展示时优先 blocks，避免 contentHtml 去掉 aa-svg-gallery 后只剩占位文案 */
export function shouldPreferNewsRichContentBlocks(
  bodyFormat: 'html' | 'blocks' | undefined,
  richContent: ArticleContentBlock[],
  contentHtml?: string | null,
): boolean {
  if (bodyFormat === 'blocks') {
    return true;
  }
  if (!richContent.length) {
    return false;
  }
  if (richContentHasNativeMedia(richContent)) {
    return true;
  }
  return isPlaceholderArticleHtml(contentHtml);
}
