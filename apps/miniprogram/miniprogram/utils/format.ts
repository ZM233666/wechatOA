export const IMAGE_FALLBACK = '/assets/images/placeholders/placeholder.png';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatDisplayDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function toAssetUrl(value: { url: string } | string | undefined): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.url;
}

export function fallbackImageUrl(current: string): string {
  if (!current || current === IMAGE_FALLBACK) {
    return IMAGE_FALLBACK;
  }
  return IMAGE_FALLBACK;
}
