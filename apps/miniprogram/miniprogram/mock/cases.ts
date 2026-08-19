export interface ProjectCase {
  id: string;
  title: string;
  desc: string;
  image: string;
  meta: string;
  background: string;
  solution: string;
}

export const PROJECT_CASES: ProjectCase[] = [
  {
    id: 'cr450',
    title: 'CR450 High-Speed Train',
    desc: 'Next-generation braking systems for the 450 km/h CR450 EMU.',
    image: '/assets/images/content/case-cr450.png',
    meta: 'Industry: High-Speed Rail · Region: China',
    background:
      'Enhancing the next generation of high-speed rail with advanced braking performance capable of operating safely at 400 km/h.',
    solution:
      'Implementation of the highly advanced EP Compact braking systems combined with our Digital CBM platform for predictive maintenance.',
  },
  {
    id: 'jakarta',
    title: 'Jakarta-Bandung High-Speed Rail',
    desc: 'Braking solutions for Southeast Asia first high-speed rail line.',
    image: '/assets/images/content/case-jakarta.png',
    meta: 'Industry: High-Speed Rail · Region: Indonesia',
    background:
      'Providing safe and reliable operation in tropical climates for the first high-speed railway in Southeast Asia (Whoosh).',
    solution:
      'Supplying complete train braking systems, including EP braking control, bogie equipment, and air supply units.',
  },
  {
    id: 'delhi',
    title: 'Delhi Metro Expansion',
    desc: 'Comprehensive door and braking systems for mass transit.',
    image: '/assets/images/content/case-delhi.png',
    meta: 'Industry: Mass Transit · Region: India',
    background:
      'Supporting the rapid expansion of urban mobility in one of the world most populous cities.',
    solution:
      'Delivering highly reliable pneumatic braking systems and IFE entrance systems designed for high-frequency commuter operation.',
  },
];

export function getProjectCaseById(id: string): ProjectCase | undefined {
  return PROJECT_CASES.find((item) => item.id === id);
}
