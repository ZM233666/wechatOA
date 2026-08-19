export interface NewsItem {
  id: string;
  title: string;
  date: string;
  image: string;
  category: string;
  content: string;
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: '1',
    title: 'Knorr-Bremse to Supply Braking Systems for 128 CR450 High-Speed Trains in China',
    date: 'May 20, 2024',
    image: '/assets/images/content/news-1.png',
    category: 'Company News',
    content:
      'Knorr-Bremse has been awarded a major contract to equip 128 new CR450 high-speed trains for the Chinese market with advanced braking systems. This further strengthens our position as a leading global supplier in the rail transit industry.',
  },
  {
    id: '2',
    title: 'Knorr-Bremse Secures Major Contract for Jakarta-Bandung High-Speed Rail Project',
    date: 'May 15, 2024',
    image: '/assets/images/content/news-2.png',
    category: 'Project Delivery',
    content:
      'The Jakarta-Bandung high-speed rail line will be equipped with Knorr-Bremse highly reliable braking systems, ensuring passenger safety and operational efficiency.',
  },
  {
    id: '3',
    title: 'Knorr-Bremse and Chinese Partners Sign Strategic Cooperation Agreement',
    date: 'May 10, 2024',
    image: '/assets/images/content/news-3.png',
    category: 'Events',
    content:
      'A new strategic cooperation agreement has been signed today, marking a milestone in our continued localization and collaboration with key Chinese OEMs.',
  },
  {
    id: '4',
    title: 'Next-Generation EP Compact Braking System Launched',
    date: 'April 25, 2024',
    image: '/assets/images/content/news-4.png',
    category: 'Products',
    content:
      'We are thrilled to introduce the new EP Compact braking system. It provides unprecedented reliability, lower weight, and comprehensive digital integration for modern rail vehicles.',
  },
];

export const NEWS_DETAIL_FOOTER =
  'This project will enhance the overall infrastructure and deliver exceptional value to our partners in the region. We remain committed to sustainable mobility solutions.';

export function getNewsById(id: string): NewsItem | undefined {
  return NEWS_ITEMS.find((item) => item.id === id);
}
