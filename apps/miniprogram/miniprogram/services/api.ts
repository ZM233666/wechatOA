import type { HealthData } from '../types/api';
import { get } from './request';
import { API_ENDPOINTS } from './endpoints';

export function getHealth(): Promise<HealthData> {
  return get<HealthData>(API_ENDPOINTS.health);
}

export function getAppConfig<T>(): Promise<T> {
  return get<T>(API_ENDPOINTS.appConfig);
}
