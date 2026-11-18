/** Safe categories only: never propagate upstream bodies, credentials or signed URLs. */
export type ArticleApiErrorCategory = 'network' | 'timeout' | 'auth' | 'http' | 'business' | 'contract';

export class ArticleApiError extends Error {
  constructor(readonly category: ArticleApiErrorCategory) {
    super(`Article API ${category} error`);
    this.name = 'ArticleApiError';
  }
}

export function articleApiErrorCategory(error: unknown): ArticleApiErrorCategory {
  if (error instanceof ArticleApiError) return error.category;
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return 'timeout';
  }
  return 'network';
}
