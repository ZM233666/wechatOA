import type { ImageResource } from './content';

/** 与 packages/shared HomeData 对应的页面视图字段仍保持兼容 */
export interface HomeBanner {
  id: string;
  title: string;
  description: string;
  image: string;
  newsId?: string;
  targetUrl?: string;
  /** 标记为 Demo / 临时占位，便于后续替换正式素材 */
  isPlaceholder?: boolean;
}

export interface QuickEntry {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  target?: string;
}

export interface NewsSummary {
  id: string;
  title: string;
  date: string;
  image: string;
  category?: string;
}

export interface HomeApiBanner {
  id: string;
  title: string;
  description: string;
  image: ImageResource;
  targetUrl?: string;
  newsId?: string;
}

export interface HomeApiQuickEntry {
  id: string;
  title: string;
  subtitle: string;
  icon: ImageResource;
  target: string;
  path: string;
}

export interface HomeData {
  banners: HomeApiBanner[];
  quickEntries: HomeApiQuickEntry[];
  latestNews: Array<{
    id: string;
    title: string;
    summary: string;
    category: { id: string; name: string };
    publishedAt: string;
    coverImage: ImageResource;
    featured: boolean;
    pinned?: boolean;
    tags: Array<{ id: string; name: string } | string>;
  }>;
  featureFlags: {
    showHomeBanner: boolean;
    showQuickEntries: boolean;
    showLatestNews: boolean;
  };
}
