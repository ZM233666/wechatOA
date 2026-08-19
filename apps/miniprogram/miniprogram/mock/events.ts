export interface CompanyEventItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  path: string;
}

export interface OutingActivity {
  id: string;
  title: string;
  descriptionCn: string;
  descriptionEn: string;
  timeLabel: string;
  status: 'open' | 'closed';
  statusText: string;
}

export interface HealthBenefit {
  id: string;
  emoji: string;
  emojiBg: string;
  title: string;
  descriptionCn: string;
  descriptionEn: string;
}

export const COMPANY_EVENT_ITEMS: CompanyEventItem[] = [
  {
    id: 'annual-dinner',
    title: '年会 (Annual Dinner)',
    subtitle: '年度表彰与晚宴',
    icon: '/assets/images/kb-life/event-annual.png',
    iconBg: '#faf5ff',
    path: '/pages/kb-life/events/annual-dinner/index',
  },
  {
    id: 'outings',
    title: '团建出游 (Outings)',
    subtitle: '部门团建与户外活动',
    icon: '/assets/images/kb-life/event-outings.png',
    iconBg: '#f0fdf4',
    path: '/pages/kb-life/events/outings/index',
  },
  {
    id: 'health',
    title: '健康体检 (Health Checkup)',
    subtitle: '年度员工体检安排',
    icon: '/assets/images/kb-life/event-health.png',
    iconBg: '#fef2f2',
    path: '/pages/kb-life/events/health/index',
  },
];

export const ANNUAL_DINNER = {
  title: '2026 KB 员工年会 / Annual Dinner',
  subtitle: '"凝聚力量，共创未来" / "Unite & Create the Future"',
  infoTitle: '活动信息 / Event Info',
  time: '2026年1月15日 17:30',
  venue: '洲际大酒店 (InterContinental)',
  dressCode: '商务休闲 (Business Casual)',
  highlightsTitle: '活动亮点 / Highlights',
  highlights: [
    '年度表彰大会及颁奖典礼 / Awards Ceremony',
    '精彩的员工才艺表演 / Talent Shows',
    '惊喜抽奖环节 (特等奖：最新款智能手机) / Lucky Draw (Grand Prize: Latest Smartphone)',
    '丰盛的海鲜自助晚宴 / Seafood Buffet Dinner',
  ],
};

export const OUTINGS = {
  title: '部门团建与出游 / Team Building & Outings',
  subtitle: '放松身心，增进团队凝聚力 / Relax & Bond',
  activities: [
    {
      id: 'autumn-hiking',
      title: '2026 秋季徒步拓展 / Autumn Hiking',
      descriptionCn: '前往国家森林公园进行为期一天的徒步与团队协作挑战活动。',
      descriptionEn:
        'A one-day hiking and team collaboration challenge at the National Forest Park.',
      timeLabel: '时间 / Time: 10月24日 (Oct 24)',
      status: 'open',
      statusText: '报名中 / Open',
    },
    {
      id: 'spring-tour',
      title: '春季周边游 / Spring Tour',
      descriptionCn: '古镇一日游，体验传统文化，品尝地道美食。',
      descriptionEn: 'One-day ancient town tour to experience culture and local food.',
      timeLabel: '参与人数 / Participants: 45人',
      status: 'closed',
      statusText: '已结束 / Closed',
    },
  ] as OutingActivity[],
};

export const HEALTH_CARE = {
  title: '员工健康关怀 / Health Care',
  subtitle: '关注您的身心健康 / Focus on your well-being',
  checkupTitle: '年度体检安排 / Annual Checkup',
  checkupDescriptionCn:
    '2026年度员工体检已开放预约。请各位员工在指定时间内通过系统完成体检机构和日期的选择。',
  checkupDescriptionEn:
    '2026 checkups are open for booking. Please select your preferred clinic and date via the system.',
  benefitsTitle: '健康福利 / Health Benefits',
  benefits: [
    {
      id: 'insurance',
      emoji: '🛡️',
      emojiBg: '#dbeafe',
      title: '补充医疗保险 / Supp. Med. Insurance',
      descriptionCn: '门诊及住院费用额外报销',
      descriptionEn: 'Extra coverage for outpatient & inpatient',
    },
    {
      id: 'eap',
      emoji: '🧠',
      emojiBg: '#dcfce7',
      title: 'EAP 心理援助 / EAP Counseling',
      descriptionCn: '提供免费的心理咨询与辅导服务',
      descriptionEn: 'Free mental health counseling services',
    },
  ] as HealthBenefit[],
};
