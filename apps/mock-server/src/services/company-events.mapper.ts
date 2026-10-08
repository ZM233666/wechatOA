import type { ImageResource } from '@app/shared';
import type {
  AnnualDinnerRow,
  HealthCheckupRow,
  OutingActivityRow,
} from './company-events.client';

export type MappedAnnualDinner = {
  title: string;
  subtitle: string;
  infoTitle: string;
  time: string;
  venue: string;
  dressCode: string;
  highlightsTitle: string;
  highlights: string[];
};

export type MappedOutingActivity = {
  id: string;
  title: string;
  descriptionCn: string;
  descriptionEn: string;
  timeLabel: string;
  status: 'open' | 'closed';
  statusText: string;
};

export type MappedHealthCheckup = {
  title: string;
  subtitle: string;
  pdfUrl?: string;
  pdfFileName?: string;
  images: ImageResource[];
};

export const OUTINGS_PAGE_META = {
  title: '部门团建与出游 / Team Building & Outings',
  subtitle: '放松身心，增进团队凝聚力 / Relax & Bond',
};

function isPublished(status: string | undefined): boolean {
  return (status || '').toLowerCase() === 'published';
}

function splitBilingual(text: string): { cn: string; en: string } {
  const parts = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { cn: parts[0], en: parts.slice(1).join('\n') };
  }
  return { cn: text.trim(), en: '' };
}

function stripHighlightPrefix(line: string): string {
  return line.replace(/^\d+\s*[.、)）]?\s*/, '').trim();
}

function formatShanghaiDateTime(raw: string | undefined): string {
  if (!raw?.trim()) {
    return '';
  }
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return raw.trim();
  }
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatEventDate(raw: string | undefined): string {
  if (!raw?.trim()) {
    return '';
  }
  const date = new Date(`${raw.trim()}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return raw.trim();
  }
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function mapSignupStatus(signupStatus: string | undefined): {
  status: 'open' | 'closed';
  statusText: string;
} {
  const value = (signupStatus || '').toLowerCase();
  if (value === 'open') {
    return { status: 'open', statusText: '报名中 / Open' };
  }
  return { status: 'closed', statusText: '已结束 / Closed' };
}

export function mapAnnualDinner(row: AnnualDinnerRow | null): MappedAnnualDinner | null {
  if (!row || !isPublished(row.status)) {
    return null;
  }
  const title = row.title?.trim();
  if (!title) {
    return null;
  }
  const highlights = (row.highlights ?? [])
    .map((line) => stripHighlightPrefix(String(line)))
    .filter(Boolean);
  return {
    title,
    subtitle: '',
    infoTitle: '活动信息 / Event Info',
    time: formatShanghaiDateTime(row.event_time),
    venue: row.venue?.trim() || '',
    dressCode: row.dress_code?.trim() || '',
    highlightsTitle: '活动亮点 / Highlights',
    highlights,
  };
}

export function mapOutingActivities(rows: OutingActivityRow[]): MappedOutingActivity[] {
  return rows
    .filter((row) => isPublished(row.status) && row.id != null && row.title?.trim())
    .map((row) => {
      const { cn, en } = splitBilingual(row.description?.trim() || '');
      const signup = mapSignupStatus(row.signup_status);
      const dateLabel = formatEventDate(row.event_date);
      const timeLabel = dateLabel ? `时间 / Time: ${dateLabel}` : '';
      return {
        id: String(row.id),
        title: row.title!.trim(),
        descriptionCn: cn,
        descriptionEn: en,
        timeLabel,
        status: signup.status,
        statusText: signup.statusText,
      };
    });
}

function mapHealthImage(row: { url?: string; file_name?: string }, index: number): ImageResource | null {
  const url = row.url?.trim();
  if (!url) {
    return null;
  }
  const alt = row.file_name?.trim() || `health-image-${index + 1}`;
  return {
    url,
    alt,
    width: 800,
    height: 600,
    aspectRatio: 4 / 3,
  };
}

export function mapHealthCheckup(row: HealthCheckupRow | null): MappedHealthCheckup | null {
  if (!row || !isPublished(row.status)) {
    return null;
  }
  const title = row.title?.trim();
  if (!title) {
    return null;
  }
  const images = (row.images ?? [])
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((item, index) => mapHealthImage(item, index))
    .filter((item): item is ImageResource => item != null);
  return {
    title,
    subtitle: row.subtitle?.trim() || '',
    pdfUrl: row.pdf_url?.trim() || undefined,
    pdfFileName: row.pdf_file_name?.trim() || undefined,
    images,
  };
}
