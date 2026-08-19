import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@app/shared';

export class QueryValidationError extends Error {
  readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.name = 'QueryValidationError';
    this.details = details;
  }
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new QueryValidationError('Invalid pagination parameter', {
      value,
    });
  }
  return numeric;
}

export function parsePaginationQuery(query: Record<string, unknown>): {
  page: number;
  pageSize: number;
} {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const pageSize = parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE);
  if (pageSize > MAX_PAGE_SIZE) {
    throw new QueryValidationError('pageSize exceeds maximum', {
      pageSize,
      max: MAX_PAGE_SIZE,
    });
  }
  return { page, pageSize };
}

export function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  throw new QueryValidationError('Invalid boolean parameter', { value });
}

export function matchesKeyword(haystack: string, keyword?: string): boolean {
  if (!keyword) {
    return true;
  }
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}
