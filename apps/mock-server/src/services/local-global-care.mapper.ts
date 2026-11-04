import type { EmployeeCareData, ImageResource } from '@app/shared';
import { mockEnv } from '../config/env';
import { extractPlainTextFromHtml } from './article-html.service';
import type { LocalGlobalCareRow } from './local-global-care.client';

const DEFAULT_HERO_IMAGE: ImageResource = {
  url: '/mock-assets/kb-life/care.png',
  alt: 'Employee Care',
  width: 800,
  height: 400,
  aspectRatio: 2,
};

function cleanUrl(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveMediaUrl(storedUrl: string): string {
  const raw = cleanUrl(storedUrl);
  if (!raw) {
    return '';
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  if (raw.startsWith('/mock-assets/')) {
    return raw;
  }
  const base = mockEnv.LOCAL_GLOBAL_CARE_MEDIA_BASE_URL.replace(/\/+$/, '');
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`;
}

function toImage(url: string, alt: string): ImageResource {
  const resolved = resolveMediaUrl(url);
  if (!resolved) {
    return { ...DEFAULT_HERO_IMAGE, alt };
  }
  return {
    url: resolved,
    alt,
    width: 400,
    height: 300,
    aspectRatio: 1.33,
  };
}

function initiativeCoverImage(url: string, alt: string): ImageResource | undefined {
  const raw = cleanUrl(url);
  if (!raw) {
    return undefined;
  }
  return toImage(raw, alt);
}

function formatCareDate(iso: string | null | undefined): string {
  const raw = cleanUrl(iso ?? '');
  if (!raw) {
    return '';
  }
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : day;
}

function excerpt(html: string, maxLen = 220): string {
  const text = extractPlainTextFromHtml(html).replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen - 1)}…`;
}

function isPublished(status: string | undefined): boolean {
  return (status || '').toLowerCase() === 'published';
}

export function mapLocalGlobalCareToEmployeeCare(
  row: LocalGlobalCareRow,
  campus: string,
  fallbackHero?: EmployeeCareData['hero'],
): EmployeeCareData {
  const initiatives: EmployeeCareData['initiatives'] = [];

  if (isPublished(row.global_status)) {
    const title = cleanUrl(row.global_published_title || row.global_title) || 'Global Care';
    const globalCover = initiativeCoverImage(
      row.global_published_cover_url || row.global_cover_url || '',
      title,
    );
    initiatives.push({
      id: `care-global-${campus}`,
      title,
      category: 'Global Care',
      date: formatCareDate(row.global_published_at),
      description: excerpt(row.global_published_content_html || row.global_content_html || '') || title,
      ...(globalCover ? { image: globalCover } : {}),
      showOnKbLifeBanner: Boolean(row.global_show_on_kb_life_banner),
    });
  }

  if (isPublished(row.local_status)) {
    const title = cleanUrl(row.local_published_title || row.local_title) || 'Local Care';
    const localCover = initiativeCoverImage(
      row.local_published_cover_url || row.local_cover_url || '',
      title,
    );
    initiatives.push({
      id: `care-local-${campus}`,
      title,
      category: 'Local Care',
      date: formatCareDate(row.local_published_at),
      description: excerpt(row.local_published_content_html || row.local_content_html || '') || title,
      ...(localCover ? { image: localCover } : {}),
      showOnKbLifeBanner: Boolean(row.local_show_on_kb_life_banner),
    });
  }

  initiatives.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return {
    hero: {
      title: fallbackHero?.title || 'Local / Global Care',
      subtitle:
        fallbackHero?.subtitle ||
        'Social engagement at Knorr-Bremse locations.',
      image: fallbackHero?.image || DEFAULT_HERO_IMAGE,
    },
    initiatives,
  };
}
