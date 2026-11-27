import {
  CONTENT_NETWORK_HINT,
  CONTENT_STANDBY_DESC,
  CONTENT_STANDBY_TITLE,
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

/** 模块已开通但还没有内容。加载失败不要用这个。 */
export function standbyPageData(): {
  pageStatus: 'empty';
  emptyTitle: string;
  emptyDesc: string;
  errorText: string;
} {
  return {
    pageStatus: 'empty',
    ...standbyContentFields(),
  };
}

export function standbyContentFields(): {
  emptyTitle: string;
  emptyDesc: string;
  errorText: string;
} {
  return {
    emptyTitle: CONTENT_STANDBY_TITLE,
    emptyDesc: CONTENT_STANDBY_DESC,
    errorText: '',
  };
}

export function logPageLoadIssue(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[${scope}]`, message);
}

export {
  CONTENT_NETWORK_HINT,
  CONTENT_STANDBY_DESC,
  CONTENT_STANDBY_TITLE,
  CONTENT_UNAVAILABLE_DESC,
  CONTENT_UNAVAILABLE_TITLE,
};