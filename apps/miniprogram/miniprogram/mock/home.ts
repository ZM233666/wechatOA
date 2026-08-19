import type { HomeBanner, NewsSummary, QuickEntry } from '../types/home';
import { NEWS_ITEMS } from './news';

export const HOME_BANNERS: HomeBanner[] = [
  {
    id: 'banner-1',
    title: '2024年德国柏林国际轨道交通技术展览会',
    description: '探索最新轨道交通解决方案与创新技术',
    image: '/assets/images/banners/banner-1.png',
    isPlaceholder: true,
  },
  {
    id: 'banner-2',
    title: '智能互联：重塑轨道交通未来',
    description: '探索数字化解决方案（Demo 占位文案）',
    image: '/assets/images/banners/banner-2.png',
    isPlaceholder: true,
  },
  {
    id: 'banner-3',
    title: '品牌与创新持续前行',
    description: 'TODO：替换为正式 Banner 文案与图片',
    image: '/assets/images/banners/banner-3.png',
    isPlaceholder: true,
  },
];

export const QUICK_ENTRIES: QuickEntry[] = [
  {
    id: 'news',
    title: '新闻中心',
    subtitle: 'News Center',
    icon: '/assets/images/Home/news.png',
    target: 'NewsList',
  },
  {
    id: 'brand',
    title: '品牌介绍',
    subtitle: 'Brand Introduction',
    icon: '/assets/images/Home/companies.png',
    target: 'BrandIntro',
  },
  {
    id: 'product',
    title: '产品介绍',
    subtitle: 'Product Introduction',
    icon: '/assets/images/Home/train.png',
    target: 'ProductList',
  },
  {
    id: 'cases',
    title: '项目案例',
    subtitle: 'Project Cases',
    icon: '/assets/images/Home/briefcase.png',
    target: 'ProjectCasesList',
  },
];

export const LATEST_NEWS: NewsSummary[] = NEWS_ITEMS.slice(0, 3).map((item) => ({
  id: item.id,
  title: item.title,
  date: item.date,
  image: item.image,
  category: item.category,
}));
