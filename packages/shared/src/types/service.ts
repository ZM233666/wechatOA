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
