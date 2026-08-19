export const ERROR_CODES = {
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  MOCK_INTERNAL_ERROR: 'MOCK_INTERNAL_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiErrorBody {
  code: string;
  details: Record<string, unknown> | null;
}

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

export interface AppConfig {
  appName: string;
  brandName: string;
  locale: string;
  supportEmail: string;
  featureFlags: AppFeatureFlags;
}

export interface AppFeatureFlags {
  showHomeBanner: boolean;
  showQuickEntries: boolean;
  showLatestNews: boolean;
  showRecommendedProducts: boolean;
  showRecommendedCases: boolean;
  showServiceEntries: boolean;
  showKbLifeSummary: boolean;
  showBrandInfo: boolean;
}
