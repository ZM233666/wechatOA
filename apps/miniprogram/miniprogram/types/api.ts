export interface ApiErrorBody {
  code: string;
  details: Record<string, unknown> | null;
}

/** 与 packages/shared ApiResponse 对应 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  requestId?: string;
  timestamp?: string;
  error?: ApiErrorBody;
}

export interface HealthData {
  status: 'ok';
  timestamp?: string;
  service?: string;
  mode?: string;
  version?: string;
}

export type HealthResponse = ApiResponse<HealthData>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  url: string;
  method?: HttpMethod;
  data?: WechatMiniprogram.IAnyObject | string | ArrayBuffer;
  header?: Record<string, string>;
  timeout?: number;
}

export class RequestError extends Error {
  readonly statusCode?: number;
  readonly responseData?: unknown;
  readonly code?: string;

  constructor(message: string, statusCode?: number, responseData?: unknown, code?: string) {
    super(message);
    this.name = 'RequestError';
    this.statusCode = statusCode;
    this.responseData = responseData;
    this.code = code;
  }
}

export type PageLoadStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';
