import { z } from 'zod';
import type {
  FavoriteDto,
  IndicatorDetailDto,
  IndicatorSummaryDto,
} from '@pulse-fx/shared';
import { getClientId } from '../lib/client-id.js';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const indicatorSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  source: z.enum(['BCB_OLINDA', 'BCB_SGS', 'FRED']),
  periodicity: z.enum(['DAILY', 'MONTHLY']),
  historyWindowDays: z.number(),
  latestValue: z.number().nullable(),
  referenceDate: z.string().nullable(),
  percentChange: z.number().nullable(),
  comparisonDate: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  isFavorite: z.boolean(),
  sparkline: z.array(z.number()),
  valuePrefix: z.string().nullable(),
  valueSuffix: z.string().nullable(),
});

const indicatorDetailSchema = indicatorSummarySchema.extend({
  observations: z.array(
    z.object({
      referenceDate: z.string(),
      value: z.number(),
    }),
  ),
  dataLimitations: z.string(),
});

const favoriteSchema = z.object({
  id: z.string(),
  indicatorId: z.string(),
  code: z.string(),
  name: z.string(),
  source: z.enum(['BCB_OLINDA', 'BCB_SGS', 'FRED']),
  periodicity: z.enum(['DAILY', 'MONTHLY']),
});

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}, schema?: z.ZodType<T>): Promise<T> {
  const headers: Record<string, string> = {
    'X-Client-Id': getClientId(),
    ...(init.headers as Record<string, string> | undefined),
  };

  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(payload?.message ?? `Request failed with status ${response.status}`, response.status);
  }

  const data = await response.json();
  return schema ? schema.parse(data) : (data as T);
}

export const api = {
  listIndicators: () =>
    request('/indicators', {}, z.array(indicatorSummarySchema)) as Promise<IndicatorSummaryDto[]>,
  getIndicator: (code: string) =>
    request(`/indicators/${code}`, {}, indicatorDetailSchema) as Promise<IndicatorDetailDto>,
  listFavorites: () =>
    request('/favorites', {}, z.array(favoriteSchema)) as Promise<FavoriteDto[]>,
  addFavorite: (indicatorId: string) =>
    request('/favorites', {
      method: 'POST',
      body: JSON.stringify({ indicatorId }),
    }),
  removeFavorite: (indicatorId: string) =>
    request(`/favorites/${indicatorId}`, {
      method: 'DELETE',
    }),
};

export { ApiError };
