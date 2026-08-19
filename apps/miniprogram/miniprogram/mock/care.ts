export type CareCategory = 'Global Care' | 'Local Care' | 'Sustainability';

export interface CareHero {
  title: string;
  subtitle: string;
  image: string;
}

export interface CareInitiative {
  id: string;
  title: string;
  category: CareCategory;
  date: string;
  image: string;
  description: string;
}

export const CARE_HERO: CareHero = {
  title: 'Knorr-Bremse Local Care: Social Engagement at Our Company Locations.',
  subtitle:
    'Social engagement at Knorr-Bremse is built around two complementary approaches: Local Care, which focuses on social cohesion and community needs near our sites.',
  image: '/assets/images/kb-life/care-hero.png',
};

export const CARE_INITIATIVES: CareInitiative[] = [
  {
    id: '1',
    title: 'Global Care: Advancing WASH Projects in Southeast Asia',
    category: 'Global Care',
    date: '2026-08-01',
    image: '/assets/images/kb-life/care-wash.png',
    description:
      'Knorr-Bremse Global Care continues to fund clean water, sanitation, and hygiene projects, offering new prospects for communities in need.',
  },
  {
    id: '2',
    title: 'Local Care: Employees Volunteer for Urban Greening',
    category: 'Local Care',
    date: '2026-07-28',
    image: '/assets/images/kb-life/care-greening.png',
    description:
      'Our local teams partnered with city parks to plant over 500 trees, demonstrating our commitment to environmental sustainability.',
  },
  {
    id: '3',
    title: 'Knorr-Bremse Awarded EcoVadis Gold Status',
    category: 'Sustainability',
    date: '2026-07-15',
    image: '/assets/images/kb-life/care-ecovadis.png',
    description:
      'Recognized for our continued dedication to sustainable development, corporate social responsibility, and green supply chain initiatives.',
  },
  {
    id: '4',
    title: 'Supporting STEM Education in Local Communities',
    category: 'Local Care',
    date: '2026-06-22',
    image: '/assets/images/kb-life/care-stem.png',
    description:
      'Employees volunteer to teach science and robotics, inspiring the next generation of engineers and innovators at local schools.',
  },
];

export function getCareInitiativeById(id: string): CareInitiative | undefined {
  return CARE_INITIATIVES.find((item) => item.id === id);
}
