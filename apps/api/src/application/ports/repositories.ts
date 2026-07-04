import type { Periodicity, DataSource } from '@pulse-fx/shared';

export interface IndicatorEntity {
  id: string;
  code: string;
  source: DataSource;
  name: string;
  description: string;
  periodicity: Periodicity;
  variationRule: string;
  historyWindowDays: number;
  externalSeriesId: string | null;
  currencyPair: string | null;
  lastSyncedAt: Date | null;
}

export interface ObservationEntity {
  id: string;
  indicatorId: string;
  referenceDate: Date;
  value: number;
}

export interface FavoriteEntity {
  id: string;
  clientId: string;
  indicatorId: string;
}

export interface IndicatorRepository {
  findAll(): Promise<IndicatorEntity[]>;
  findByCode(code: string): Promise<IndicatorEntity | null>;
  findById(id: string): Promise<IndicatorEntity | null>;
  updateLastSyncedAt(id: string, syncedAt: Date): Promise<void>;
}

export interface ObservationRepository {
  upsertMany(
    indicatorId: string,
    observations: Array<{ referenceDate: Date; value: number }>,
  ): Promise<number>;
  findByIndicatorId(
    indicatorId: string,
    options?: { fromDate?: Date; limit?: number },
  ): Promise<ObservationEntity[]>;
  findLatest(indicatorId: string): Promise<ObservationEntity | null>;
}

export interface FavoriteRepository {
  findByClientId(clientId: string): Promise<FavoriteEntity[]>;
  add(clientId: string, indicatorId: string): Promise<FavoriteEntity>;
  remove(clientId: string, indicatorId: string): Promise<boolean>;
  isFavorite(clientId: string, indicatorId: string): Promise<boolean>;
}

export interface SyncRunRepository {
  start(source: string): Promise<string>;
  finish(
    id: string,
    payload: {
      status: 'completed' | 'failed' | 'partial';
      recordsUpserted: number;
      errorMessage?: string;
    },
  ): Promise<void>;
}
