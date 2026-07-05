import type { SyncResultDto } from '@pulse-fx/shared';
import type {
  BcbOlindaGateway,
  BcbSgsGateway,
  FredGateway,
} from '../ports/external-gateways.js';
import type {
  IndicatorEntity,
  IndicatorRepository,
  ObservationRepository,
  SyncRunRepository,
} from '../ports/repositories.js';

interface SyncIndicatorsUseCaseDeps {
  indicators: IndicatorRepository;
  observations: ObservationRepository;
  syncRuns: SyncRunRepository;
  bcbOlinda: BcbOlindaGateway;
  bcbSgs: BcbSgsGateway;
  fred: FredGateway;
  ttlDailyHours: number;
  ttlMonthlyHours: number;
  force?: boolean;
}

function hoursSince(date: Date | null): number {
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

function ttlForIndicator(indicator: IndicatorEntity, dailyHours: number, monthlyHours: number) {
  return indicator.periodicity === 'DAILY' ? dailyHours : monthlyHours;
}

function startDateForIndicator(indicator: IndicatorEntity): Date {
  const days = indicator.historyWindowDays + 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export class SyncIndicatorsUseCase {
  constructor(private readonly deps: SyncIndicatorsUseCaseDeps) {}

  async execute(options?: { force?: boolean }): Promise<SyncResultDto> {
    const force = options?.force ?? this.deps.force ?? false;
    const runId = await this.deps.syncRuns.start('all');
    const allIndicators = await this.deps.indicators.findAll();
    let recordsUpserted = 0;
    let skippedByTtl = 0;
    const errors: string[] = [];

    for (const indicator of allIndicators) {
      const ttlHours = ttlForIndicator(
        indicator,
        this.deps.ttlDailyHours,
        this.deps.ttlMonthlyHours,
      );

      if (!force && hoursSince(indicator.lastSyncedAt) < ttlHours) {
        skippedByTtl += 1;
        continue;
      }

      try {
        const startDate = startDateForIndicator(indicator);
        const endDate = new Date();
        let normalized: Array<{ referenceDate: Date; value: number }> = [];

        if (indicator.source === 'BCB_OLINDA') {
          normalized = await this.deps.bcbOlinda.fetchPtax({
            currency: indicator.currencyPair ?? 'USD',
            startDate,
            endDate,
          });
        } else if (indicator.source === 'BCB_SGS') {
          normalized = await this.deps.bcbSgs.fetchSeries({
            seriesCode: indicator.externalSeriesId ?? '',
            startDate,
            endDate,
          });
        } else if (indicator.source === 'FRED') {
          normalized = await this.deps.fred.fetchSeries({
            seriesId: indicator.externalSeriesId ?? '',
            startDate,
            endDate,
          });
        }

        const upserted = await this.deps.observations.upsertMany(indicator.id, normalized);
        recordsUpserted += upserted;
        await this.deps.indicators.updateLastSyncedAt(indicator.id, new Date());
      } catch (error) {
        errors.push(
          `${indicator.code}: ${error instanceof Error ? error.message : 'Unknown sync error'}`,
        );
      }
    }

    const status = errors.length === 0 ? 'completed' : recordsUpserted > 0 ? 'partial' : 'failed';

    await this.deps.syncRuns.finish(runId, {
      status,
      recordsUpserted,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
    });

    return {
      status,
      recordsUpserted,
      skippedByTtl,
      errors,
    };
  }
}
