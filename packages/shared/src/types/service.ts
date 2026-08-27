import type { ImageResource } from './image';
import type { ArticleContentBlock } from './article';

export type ServiceIconTone = 'blue' | 'gold';

export interface ServiceSummary {
  id: string;
  title: string;
  subtitle: string;
  footerTitle: string;
  footerHint: string;
  coverImage: ImageResource;
  icon: ImageResource;
  iconTone: ServiceIconTone;
  showOnline: boolean;
  kind: 'hero' | 'insight';
  kicker?: string;
  english?: string;
  caption?: string;
  tag?: string;
  gating?: boolean;
}

export interface ServiceDetail {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  coverImage: ImageResource;
  richContent: ArticleContentBlock[];
  relatedIds: string[];
}

export interface ServicesPageData {
  heroCards: ServiceSummary[];
  insightCovers: ServiceSummary[];
}

export type InsightReportPageType = 'cover' | 'contents' | 'content' | 'sheet';

export interface InsightTocItem {
  index: string;
  titleEn: string;
  titleCn: string;
  lines: string[];
}

export interface InsightReportPage {
  id: string;
  type: InsightReportPageType;
  title: string;
  coverImage?: ImageResource;
  headlineCn?: string[];
  headlineEn?: string;
  institute?: string;
  brand?: string;
  toc?: InsightTocItem[];
  chapterLabel?: string;
  chapterTitle?: string;
  bodyImage?: ImageResource;
  paragraphs?: string[];
  bullets?: string[];
}

export interface InsightReportSummary {
  id: string;
  title: string;
  titleEn: string;
  caption: string;
  kicker: string;
  english: string;
  coverImage: ImageResource;
  gating: boolean;
  tag?: string;
  /**
   * PDF 源文件访问路径（相对 `/mock-assets/...`，经 mock 层转为绝对 URL）。
   * 阅读统一走小程序内翻页阅读器；`pdfUrl` 可用于下载等辅助能力。
   */
  pdfUrl?: string;
}

export interface InsightReport extends InsightReportSummary {
  /** 翻页阅读器内容；可由 JSON pages 或 PDF 渲出的 sheet 页组成 */
  pages: InsightReportPage[];
}
