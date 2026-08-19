/** 与 packages/shared ImageResource 对应 */
export interface ImageResource {
  url: string;
  alt: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

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

export interface CalloutBlock {
  id: string;
  type: 'callout';
  variant: 'info' | 'warning' | 'success' | 'exclusive';
  title?: string;
  text: string;
}

export interface LinkBlock {
  id: string;
  type: 'link';
  text: string;
  url: string;
  linkType: 'internal' | 'external';
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
