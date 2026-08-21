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

export type InsightReportPageType = 'cover' | 'contents' | 'content';

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
}

export interface InsightReport extends InsightReportSummary {
  pages: InsightReportPage[];
}
