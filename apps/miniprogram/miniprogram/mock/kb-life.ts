export interface LifeBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

export interface CampusService {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export interface EmployeeService {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export const LIFE_BANNERS: LifeBanner[] = [
  {
    id: 'life-1',
    title: '企业文化：协同 · 创新 · 成长',
    subtitle: 'Culture: Together We Grow',
    image: '/assets/images/banners/banner-1.png',
  },
  {
    id: 'life-2',
    title: '敏捷团队：共创辉煌',
    subtitle: 'Agile Teams: Creating Brilliance',
    image: '/assets/images/banners/banner-2.png',
  },
  {
    id: 'life-3',
    title: '年度优秀表彰大会',
    subtitle: 'Annual Awards Ceremony',
    image: '/assets/images/banners/banner-3.png',
  },
];

export const CAMPUS_LOCATIONS = ['Suzhou', 'Qingdao', 'Daxing', 'Nankou'];

export const CAMPUS_SERVICES: CampusService[] = [
  {
    id: 'campus-map',
    title: '园区地图',
    subtitle: 'Campus Map',
    icon: '/assets/images/kb-life/map.png',
  },
  {
    id: 'shuttle-bus',
    title: '班车时刻',
    subtitle: 'Shuttle Bus',
    icon: '/assets/images/kb-life/bus.png',
  },
  {
    id: 'cafeteria',
    title: '食堂菜单',
    subtitle: 'Cafeteria',
    icon: '/assets/images/kb-life/cafeteria.png',
  },
  {
    id: 'holiday',
    title: '假期日历',
    subtitle: 'Holiday Calendar',
    icon: '/assets/images/kb-life/calendar.png',
  },
];

export const EMPLOYEE_SERVICES: EmployeeService[] = [
  {
    id: 'open-positions',
    title: '在聘岗位',
    subtitle: 'Open Positions',
    icon: '/assets/images/kb-life/positions.png',
  },
  {
    id: 'handbook',
    title: '员工手册',
    subtitle: 'Employee Handbook',
    icon: '/assets/images/kb-life/handbook.png',
  },
  {
    id: 'care',
    title: '本地/全球关怀',
    subtitle: 'Local/Global Care',
    icon: '/assets/images/kb-life/care.png',
  },
  {
    id: 'events',
    title: '公司事件',
    subtitle: 'Company Events',
    icon: '/assets/images/kb-life/events.png',
  },
];
