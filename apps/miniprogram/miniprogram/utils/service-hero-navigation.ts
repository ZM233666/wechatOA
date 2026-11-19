import type { ServiceFeatureKey } from '../constants/service-feature-copy';
import { buildServiceFeatureIntroUrl } from '../constants/service-feature-copy';

/** 解析 Services 首页 Hero 卡片对应的功能介绍页（避免 data-id 在部分运行时不可用） */
export function resolveServiceHeroFeature(
  heroId?: string,
  title?: string,
): ServiceFeatureKey | null {
  const id = (heroId || '').trim().toLowerCase();
  if (id === 'digital-cbm' || id.includes('digital-cbm')) {
    return 'digital-cbm';
  }
  if (id === 'fast-phm' || id === 'my-dashboard' || id.includes('fast-phm')) {
    return 'fast-phm';
  }

  const normalizedTitle = (title || '').trim().toLowerCase();
  if (normalizedTitle.includes('digital cbm')) {
    return 'digital-cbm';
  }
  if (normalizedTitle.includes('my dashboard')) {
    return 'fast-phm';
  }
  return null;
}

export function openServiceFeatureIntro(feature: ServiceFeatureKey): void {
  const url = buildServiceFeatureIntroUrl(feature);
  wx.navigateTo({
    url,
    fail: () => {
      wx.redirectTo({
        url,
        fail: () => {
          wx.showToast({ title: '无法打开页面，请重新编译后重试', icon: 'none' });
        },
      });
    },
  });
}