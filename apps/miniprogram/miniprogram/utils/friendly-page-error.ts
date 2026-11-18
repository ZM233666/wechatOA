import {
  CONTENT_NETWORK_HINT,
  CONTENT_UNAVAILABLE_DESC,
  CONTENT_UNAVAILABLE_TITLE,
} from '../constants/content-unavailable';

/** 列表/详情拉取失败：统一空态，不向用户暴露 HTTP 或后端 message */
export function friendlyUnavailablePageData(options?: {
  title?: string;
  description?: string;
}): {
  pageStatus: 'empty';
  emptyTitle: string;
  emptyDesc: string;
  errorText: string;
} {
  return {
    pageStatus: 'empty',
    emptyTitle: options?.title ?? CONTENT_UNAVAILABLE_TITLE,
    emptyDesc: options?.description ?? CONTENT_UNAVAILABLE_DESC,
    errorText: '',
  };
}

export function logPageLoadIssue(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[${scope}]`, message);
}

export { CONTENT_NETWORK_HINT, CONTENT_UNAVAILABLE_DESC, CONTENT_UNAVAILABLE_TITLE };