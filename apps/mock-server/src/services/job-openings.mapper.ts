import type { OpenPositionDetail, OpenPositionSummary } from '@app/shared';
import { extractPlainTextFromHtml } from './article-html.service';
import type { JobOpeningRow } from './job-openings.client';

export function toJobPublicId(backendId: number | string): string {
  return `job-${backendId}`;
}

export function parseJobBackendId(publicId: string): string | null {
  const raw = publicId.trim();
  if (!raw) {
    return null;
  }
  if (raw.startsWith('job-')) {
    const rest = raw.slice(4);
    return rest || null;
  }
  return raw;
}

function contentJson(row: JobOpeningRow): Record<string, unknown> {
  const value = row.content_json;
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function pickString(json: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = json[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function splitDescriptionAndRequirements(html: string): { description: string; requirements: string } {
  const plain = extractPlainTextFromHtml(html).trim();
  if (!plain) {
    return { description: '', requirements: '' };
  }
  const markers = [
    /任职要求\s*[(:：]/i,
    /Requirements\s*[(:：]/i,
    /\n\s*Requirements\b/i,
    /\n\s*任职要求\b/i,
  ];
  for (const marker of markers) {
    const match = plain.match(marker);
    if (match && match.index != null && match.index > 0) {
      const requirements = plain
        .slice(match.index)
        .replace(/^[\s\S]*?(?:Requirements|任职要求)\s*[(:：)]?\s*/i, '')
        .trim();
      return {
        description: plain.slice(0, match.index).trim(),
        requirements,
      };
    }
  }
  return { description: plain, requirements: '' };
}

function mapBaseFields(row: JobOpeningRow): OpenPositionSummary {
  const json = contentJson(row);
  const title = (row.title_zh || row.title_en || '').trim() || 'Open Position';
  return {
    id: toJobPublicId(row.id),
    title,
    department: pickString(json, ['department', 'dept']) || (row.category || '').trim() || '—',
    location: pickString(json, ['location', 'work_location']) || (row.source || '').trim() || '—',
    type:
      pickString(json, ['type', 'job_type', 'employment_type']) ||
      (row.tags && Array.isArray(row.tags) && typeof row.tags[0] === 'string' ? row.tags[0] : '') ||
      'Full-time',
  };
}

export function mapJobOpeningSummary(row: JobOpeningRow): OpenPositionSummary {
  return mapBaseFields(row);
}

export function mapJobOpeningDetail(row: JobOpeningRow): OpenPositionDetail {
  const base = mapBaseFields(row);
  const json = contentJson(row);
  const descriptionFromJson = pickString(json, ['description', 'job_description', 'content']);
  const requirementsFromJson = pickString(json, ['requirements', 'job_requirements']);
  if (descriptionFromJson || requirementsFromJson) {
    return {
      ...base,
      description: descriptionFromJson || (row.summary || '').trim(),
      requirements: requirementsFromJson,
    };
  }
  const split = splitDescriptionAndRequirements(row.content_html || '');
  return {
    ...base,
    description: split.description || (row.summary || '').trim() || titleFallback(base.title),
    requirements: split.requirements,
  };
}

function titleFallback(title: string): string {
  return title ? `${title} — 详见岗位说明。` : '';
}
