export interface ProductItem {
  name: string;
  desc: string;
  img: string;
}

export interface ProductCategory {
  id: string;
  title: string;
  titleCn: string;
  subtitleEn: string;
  desc: string;
  image: string;
  products: ProductItem[];
}

export interface ProductHeroSlide {
  title: string;
  image: string;
}

export const PRODUCT_HERO_SLIDES: ProductHeroSlide[] = [
  {
    title: '空气处理单元',
    image: '/assets/images/content/product-hero-1.png',
  },
  {
    title: '制动控制系统',
    image: '/assets/images/content/product-hero-2.png',
  },
  {
    title: '智能门系统',
    image: '/assets/images/content/product-hero-3.png',
  },
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'braking',
    title: 'Braking Systems',
    titleCn: '制动系统',
    subtitleEn: 'Braking',
    desc: 'Intelligent, highly integrated braking technologies for all types of rail vehicles.',
    image: '/assets/images/content/product-braking.png',
    products: [
      {
        name: 'EP Compact',
        desc: 'Electronic brake control system ensuring precise and safe braking.',
        img: '/assets/images/content/product-hero-2.png',
      },
      {
        name: 'Bogie Equipment',
        desc: 'Brake calipers, discs, and pads designed for optimal friction.',
        img: '/assets/images/content/product-braking.png',
      },
      {
        name: 'Air Supply Units',
        desc: 'Oil-free compressors and air treatment for clean, reliable air.',
        img: '/assets/images/content/product-hero-1.png',
      },
    ],
  },
  {
    id: 'door',
    title: 'Door Systems (IFE)',
    titleCn: '门系统',
    subtitleEn: 'Door',
    desc: 'Reliable, smart entrance systems for smooth passenger flow.',
    image: '/assets/images/content/product-door.png',
    products: [
      {
        name: 'E3 Door System',
        desc: 'Space-saving sliding plug doors for metro and regional trains.',
        img: '/assets/images/content/product-door.png',
      },
      {
        name: 'Sensors & Control',
        desc: 'Advanced obstacle detection and smart door controls.',
        img: '/assets/images/content/product-hero-3.png',
      },
    ],
  },
  {
    id: 'power',
    title: 'Power Supply Systems (Microelettrica)',
    titleCn: '电源系统',
    subtitleEn: 'Power Supply',
    desc: 'Advanced power components and control solutions for reliable rail vehicle energy management.',
    image: '/assets/images/content/product-power.png',
    products: [
      {
        name: 'High-Speed Circuit Breakers',
        desc: 'DC protection devices designed to interrupt short circuit currents rapidly and safely.',
        img: '/assets/images/content/product-power.png',
      },
      {
        name: 'Contactors',
        desc: 'Robust AC/DC contactors for traction and auxiliary converters with extended electrical life.',
        img: '/assets/images/content/product-hero-2.png',
      },
      {
        name: 'Protection Relays',
        desc: 'Advanced electronic relays for voltage, current, and motor protection monitoring.',
        img: '/assets/images/content/product-hero-1.png',
      },
    ],
  },
];

export function getProductCategoryById(id: string): ProductCategory | undefined {
  return PRODUCT_CATEGORIES.find((item) => item.id === id);
}

export function filterProductCategories(keyword: string): ProductCategory[] {
  const value = keyword.trim().toLowerCase();
  if (!value) {
    return PRODUCT_CATEGORIES;
  }
  return PRODUCT_CATEGORIES.filter((item) => {
    const haystack = `${item.title} ${item.titleCn} ${item.subtitleEn} ${item.desc}`.toLowerCase();
    return haystack.indexOf(value) >= 0;
  });
}
