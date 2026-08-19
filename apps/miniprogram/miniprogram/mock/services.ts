export interface ServiceHeroCard {
  id: string;
  title: string;
  subtitle: string;
  footerTitle: string;
  footerHint: string;
  image: string;
  icon: string;
  iconTone: 'blue' | 'gold';
  showOnline?: boolean;
}

export interface InsightCover {
  id: string;
  kicker: string;
  title: string;
  english: string;
  caption: string;
  image: string;
  tag?: string;
}

export const SERVICE_HERO_CARDS: ServiceHeroCard[] = [
  {
    id: 'digital-cbm',
    title: 'Digital CBM',
    subtitle: 'Condition Based Maintenance',
    footerTitle: '实时状态监测',
    footerHint: '实时数据分析与健康预警',
    image: '/assets/images/banners/banner-1.png',
    icon: '/assets/images/Services/monitor.png',
    iconTone: 'blue',
    showOnline: true,
  },
  {
    id: 'fast-phm',
    title: 'FastPHM',
    subtitle: 'Predictive Health Management',
    footerTitle: '预测性维护',
    footerHint: '智能故障预测与诊断',
    image: '/assets/images/banners/banner-2.png',
    icon: '/assets/images/Services/alert.png',
    iconTone: 'gold',
  },
];

export const INSIGHT_COVERS: InsightCover[] = [
  {
    id: 'insight-trend',
    kicker: 'KB Insights',
    title: '2025轨道交通趋势洞察',
    english: 'Rail Transit Trend Insight',
    caption: '2025轨道交通趋势洞察',
    image: '/assets/images/news/news-1.png',
    tag: 'Gating',
  },
  {
    id: 'insight-lcc',
    kicker: 'KB Insights',
    title: 'LCC全生命周期成本分析',
    english: 'Life Cycle Cost Analysis',
    caption: 'LCC全生命周期成本分析',
    image: '/assets/images/news/news-2.png',
  },
];
