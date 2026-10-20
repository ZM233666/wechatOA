import type { ImageResource } from './image';

export type RichTextMark = 'bold' | 'italic' | 'underline';

export interface RichTextSpan {
  type: 'text' | 'link';
  text: string;
  href?: string;
  marks?: RichTextMark[];
}

export type TextAlign = 'left' | 'center' | 'right';

export type ImageLayout = 'normal' | 'wide' | 'full';

export interface HeadingBlock {
  id: string;
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
  align?: TextAlign;
}

export interface ParagraphBlock {
  id: string;
  type: 'paragraph';
  align?: TextAlign;
  spans: RichTextSpan[];
}

export interface ImageBlock {
  id: string;
  type: 'image';
  image: ImageResource;
  caption?: string;
  layout?: ImageLayout;
}

export interface QuoteBlock {
  id: string;
  type: 'quote';
  text: string;
  source?: string;
}

export interface ListBlock {
  id: string;
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface DividerBlock {
  id: string;
  type: 'divider';
}

export type CalloutVariant = 'info' | 'warning' | 'success' | 'exclusive';

export interface CalloutBlock {
  id: string;
  type: 'callout';
  variant: CalloutVariant;
  title?: string;
  text: string;
}

export type ArticleLinkType = 'internal' | 'external';

export interface LinkBlock {
  id: string;
  type: 'link';
  text: string;
  url: string;
  linkType: ArticleLinkType;
}

/** 图文轮播（含 SVG / PNG 等，由 slides[].url 指向资源） */
export interface MediaCarouselBlock {
  id: string;
  type: 'carousel';
  slides: ImageResource[];
  caption?: string;
  autoplay?: boolean;
  interval?: number;
}

/** 正文内嵌视频（须为小程序 download 合法域名） */
export interface VideoBlock {
  id: string;
  type: 'video';
  src: string;
  poster?: string;
  caption?: string;
}

export type ArticleContentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | QuoteBlock
  | ListBlock
  | DividerBlock
  | CalloutBlock
  | LinkBlock
  | MediaCarouselBlock
  | VideoBlock;

export interface ArticleCategory {
  id: string;
  name: string;
}

export interface ArticleAuthor {
  name: string;
}

export interface ArticleShare {
  title: string;
  imageUrl: string;
}

export interface ArticleDetail {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  category: ArticleCategory;
  author: ArticleAuthor;
  publishedAt: string;
  coverImage: ImageResource;
  richContent: ArticleContentBlock[];
  tags: string[];
  relatedIds: string[];
  share: ArticleShare;
}
