export interface CanteenMenuItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

export const CANTEEN_INTRO =
  '公司食堂由全球领先的生活质量服务商索迪斯（Sodexo）集团负责运营管理。我们致力于为员工提供营养均衡、美味健康的日常餐饮。食堂严选新鲜食材，遵循严格的食品安全标准，定期推出各地特色美食节，满足员工多元化的口味需求。';

export const CANTEEN_MENU_ITEMS: CanteenMenuItem[] = [
  {
    id: 'set-a',
    title: '精选套餐 A (Set A)',
    description: '红烧排骨、清炒时蔬、番茄炒蛋、例汤',
    image: '/assets/images/kb-life/menu-set-a.png',
  },
  {
    id: 'healthy',
    title: '健康轻食 (Healthy Diet)',
    description: '香煎鸡胸肉沙拉配油醋汁、全麦面包',
    image: '/assets/images/kb-life/menu-healthy.png',
  },
  {
    id: 'noodle',
    title: '特色面档 (Noodle Bar)',
    description: '招牌牛肉面、酸菜肉丝面、手工小笼包',
    image: '/assets/images/kb-life/menu-noodle.png',
  },
];
