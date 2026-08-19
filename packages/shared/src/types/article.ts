import type { ImageResource } from './image';

export type RichTextMark = 'bold' | 'italic' | 'underline';

export interface RichTextSpan {
  type: 'text' | 'link';
  text: string;
  href?: string;
  marks?: RichTextMark[];
}

export interface HeadingBlock {
  id: string;
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

export interface ParagraphBlock {
  id: string;
  type: 'paragraph';
  spans: RichTextSpan[];
}

export interface ImageBlock {
  id: string;
  type: 'image';
  image: ImageResource;
  caption?: string;
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

export type CalloutVariant = 'info' | 'warning' | 'success';

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

export type ArticleContentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | QuoteBlock
  | ListBlock
  | DividerBlock
  | CalloutBlock
  | LinkBlock;

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
