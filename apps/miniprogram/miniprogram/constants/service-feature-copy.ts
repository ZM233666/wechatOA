export type ServiceFeatureKey = 'digital-cbm' | 'fast-phm';

export interface ServiceFeatureIntroCopy {
  navTitle: string;
  subtitle: string;
  descZh: string;
  descEn: string;
  authHintZh: string;
  authHintEn: string;
  tone: 'blue' | 'gold';
}

export const SERVICE_FEATURE_INTROS: Record<ServiceFeatureKey, ServiceFeatureIntroCopy> = {
  'digital-cbm': {
    navTitle: 'Digital CBM',
    subtitle: 'Condition Based Maintenance',
    descZh:
      'Digital CBM 通过整合车辆状态与运行数据，实现关键部件状态监测、趋势分析和维护决策支持，推动传统定期维护向数据驱动、预测性维护转型，降低维护成本与故障风险，并为智能化数字服务奠定基础。',
    descEn:
      'Digital CBM integrates vehicle condition and operational data to enable condition monitoring, trend analysis, and maintenance decision support, shifting traditional scheduled maintenance toward data-driven and predictive maintenance, reducing maintenance costs and failure risks while building the foundation for intelligent digital services.',
    authHintZh: '完成企业身份绑定后，获准用户可访问 Digital CBM 监测看板与相关数据服务。',
    authHintEn:
      'After enterprise identity binding, authorized users may access the Digital CBM dashboard and data services.',
    tone: 'blue',
  },
  'fast-phm': {
    navTitle: 'Fast PHM',
    subtitle: 'Predictive Health Management',
    descZh:
      'FastPHM 是面向 PHM 应用的快速开发与复用方案，通过标准化架构和模块化组件，提高跨项目复用能力，大幅减少重复开发工作，加速 PHM 解决方案从需求到交付。',
    descEn:
      'FastPHM is a rapid development and reuse solution for PHM applications. Through standardized architecture and modular components, it enables cross-project reuse, significantly reduces repetitive development effort, and accelerates PHM solutions from requirements to delivery.',
    authHintZh: '完成企业身份绑定后，获准用户可进入 My Dashboard 并使用 Fast PHM 模块。',
    authHintEn:
      'After enterprise identity binding, authorized users may open My Dashboard and use the Fast PHM module.',
    tone: 'gold',
  },
};

export function buildServiceFeatureIntroUrl(feature: ServiceFeatureKey): string {
  return `/subpackages/services/feature-intro/index?feature=${feature}`;
}

export function parseServiceFeatureKey(raw: string | undefined): ServiceFeatureKey | null {
  if (raw === 'digital-cbm' || raw === 'fast-phm') {
    return raw;
  }
  return null;
}