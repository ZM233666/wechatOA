import type { PaginatedData, PaginationMeta } from '@app/shared';

export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedData<T> {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);
  const pagination: PaginationMeta = {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1 && totalPages > 0,
  };
  return {
    items: pagedItems,
    pagination,
  };
}

export function emptyPage<T>(page: number, pageSize: number): PaginatedData<T> {
  return {
    items: [],
    pagination: {
      page,
      pageSize,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    },
  };
}
