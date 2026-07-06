export type Periodicity = 'DAILY' | 'MONTHLY';

export type DataSource = 'BCB_OLINDA' | 'BCB_SGS' | 'FRED';

export interface IndicatorSummaryDto {
  id: string;
  code: string;
  name: string;
  description: string;
  source: DataSource;
  periodicity: Periodicity;
  historyWindowDays: number;
  latestValue: number | null;
  referenceDate: string | null;
  percentChange: number | null;
  comparisonDate: string | null;
  lastSyncedAt: string | null;
  isFavorite: boolean;
  sparkline: number[];
  valuePrefix: string | null;
  valueSuffix: string | null;
}

export interface ObservationDto {
  referenceDate: string;
  value: number;
}

export interface IndicatorDetailDto extends IndicatorSummaryDto {
  observations: ObservationDto[];
  dataLimitations: string;
}

export interface FavoriteDto {
  id: string;
  indicatorId: string;
  code: string;
  name: string;
  source: DataSource;
  periodicity: Periodicity;
}

export interface SyncResultDto {
  status: 'completed' | 'partial' | 'failed';
  recordsUpserted: number;
  skippedByTtl: number;
  errors: string[];
}

export interface HealthDto {
  status: 'ok' | 'degraded';
  database: 'connected' | 'disconnected';
  timestamp: string;
}
