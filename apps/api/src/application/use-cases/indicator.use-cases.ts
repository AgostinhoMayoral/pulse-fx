import type { IndicatorDetailDto, IndicatorSummaryDto } from '@pulse-fx/shared';
import { calculateVariation, formatDateOnly } from '../../domain/calculate-variation.js';
import { NotFoundError } from '../../domain/errors.js';
import type {
  FavoriteRepository,
  IndicatorRepository,
  ObservationRepository,
} from '../ports/repositories.js';

const SPARKLINE_SAMPLE_SIZE = 20;

interface ValueUnit {
  prefix?: string;
  suffix?: string;
}

// Raw observation values carry no unit on their own (a bare "333.98" reads as
// nothing in particular to someone outside finance). Attach the unit each
// series is actually denominated in so the UI never shows a naked number.
const VALUE_UNITS: Record<string, ValueUnit> = {
  USD_BRL_PTAX: { prefix: 'R$' },
  EUR_BRL_PTAX: { prefix: 'R$' },
  SELIC_META: { suffix: '% a.a.' },
  IPCA: { suffix: '% a.m.' },
  FEDFUNDS: { suffix: '% a.a.' },
  CPI_US: { suffix: 'pts de índice' },
};

const DATA_LIMITATIONS: Record<string, string> = {
  USD_BRL_PTAX:
    'PTAX is the official BCB closing reference rate, not a live market quote. Weekend and holiday gaps use the last available business-day observation without interpolation.',
  EUR_BRL_PTAX:
    'PTAX is the official BCB closing reference rate, not a live market quote. Weekend and holiday gaps use the last available business-day observation without interpolation.',
  SELIC_META:
    'Selic target is a policy reference published by BCB. Monthly variation compares calendar months and may lag operational market expectations.',
  IPCA:
    'IPCA is a monthly inflation index with publication lag. Missing months keep the last published observation as the comparison baseline.',
  FEDFUNDS:
    'Effective Federal Funds Rate reflects US monetary conditions. FRED publication may revise historical points after release.',
  CPI_US:
    'US CPI is seasonally adjusted monthly data from FRED. It is useful for inflation context, not for intraday trading decisions.',
};

export class ListIndicatorsUseCase {
  constructor(
    private readonly indicators: IndicatorRepository,
    private readonly observations: ObservationRepository,
    private readonly favorites: FavoriteRepository,
  ) {}

  async execute(clientId?: string): Promise<IndicatorSummaryDto[]> {
    const allIndicators = await this.indicators.findAll();
    const favoriteIds = clientId
      ? new Set((await this.favorites.findByClientId(clientId)).map((item) => item.indicatorId))
      : new Set<string>();

    const summaries = await Promise.all(
      allIndicators.map(async (indicator) => {
        const history = await this.observations.findByIndicatorId(indicator.id, {
          fromDate: new Date(Date.now() - indicator.historyWindowDays * 24 * 60 * 60 * 1000),
        });

        const variation = calculateVariation(
          history.map((item) => ({
            referenceDate: item.referenceDate,
            value: item.value,
          })),
          indicator.periodicity,
        );

        const latest = history.at(-1) ?? null;

        return {
          id: indicator.id,
          code: indicator.code,
          name: indicator.name,
          description: indicator.description,
          source: indicator.source,
          periodicity: indicator.periodicity,
          historyWindowDays: indicator.historyWindowDays,
          latestValue: latest?.value ?? variation?.value ?? null,
          referenceDate: latest ? formatDateOnly(latest.referenceDate) : null,
          percentChange: variation?.percentChange ?? null,
          comparisonDate: variation ? formatDateOnly(variation.comparisonDate) : null,
          lastSyncedAt: indicator.lastSyncedAt?.toISOString() ?? null,
          isFavorite: favoriteIds.has(indicator.id),
          sparkline: history.slice(-SPARKLINE_SAMPLE_SIZE).map((item) => item.value),
          valuePrefix: VALUE_UNITS[indicator.code]?.prefix ?? null,
          valueSuffix: VALUE_UNITS[indicator.code]?.suffix ?? null,
        } satisfies IndicatorSummaryDto;
      }),
    );

    return summaries;
  }
}

export class GetIndicatorDetailUseCase {
  constructor(
    private readonly indicators: IndicatorRepository,
    private readonly observations: ObservationRepository,
    private readonly favorites: FavoriteRepository,
  ) {}

  async execute(code: string, clientId?: string): Promise<IndicatorDetailDto> {
    const indicator = await this.indicators.findByCode(code);
    if (!indicator) {
      throw new NotFoundError('Indicator', code);
    }

    const fromDate = new Date(Date.now() - indicator.historyWindowDays * 24 * 60 * 60 * 1000);
    const history = await this.observations.findByIndicatorId(indicator.id, { fromDate });
    const variation = calculateVariation(
      history.map((item) => ({
        referenceDate: item.referenceDate,
        value: item.value,
      })),
      indicator.periodicity,
    );
    const latest = history.at(-1) ?? null;
    const isFavorite = clientId
      ? await this.favorites.isFavorite(clientId, indicator.id)
      : false;

    return {
      id: indicator.id,
      code: indicator.code,
      name: indicator.name,
      description: indicator.description,
      source: indicator.source,
      periodicity: indicator.periodicity,
      historyWindowDays: indicator.historyWindowDays,
      latestValue: latest?.value ?? variation?.value ?? null,
      referenceDate: latest ? formatDateOnly(latest.referenceDate) : null,
      percentChange: variation?.percentChange ?? null,
      comparisonDate: variation ? formatDateOnly(variation.comparisonDate) : null,
      lastSyncedAt: indicator.lastSyncedAt?.toISOString() ?? null,
      isFavorite,
      sparkline: history.slice(-SPARKLINE_SAMPLE_SIZE).map((item) => item.value),
      valuePrefix: VALUE_UNITS[indicator.code]?.prefix ?? null,
      valueSuffix: VALUE_UNITS[indicator.code]?.suffix ?? null,
      observations: history.map((item) => ({
        referenceDate: formatDateOnly(item.referenceDate),
        value: item.value,
      })),
      dataLimitations:
        DATA_LIMITATIONS[indicator.code] ??
        'Public series may contain publication delays, revisions, and missing dates. Values are persisted snapshots, not live trading quotes.',
    };
  }
}

export class ToggleFavoriteUseCase {
  constructor(
    private readonly indicators: IndicatorRepository,
    private readonly favorites: FavoriteRepository,
  ) {}

  async add(clientId: string, indicatorId: string) {
    const indicator = await this.indicators.findById(indicatorId);
    if (!indicator) {
      throw new NotFoundError('Indicator', indicatorId);
    }

    return this.favorites.add(clientId, indicatorId);
  }

  async remove(clientId: string, indicatorId: string) {
    return this.favorites.remove(clientId, indicatorId);
  }
}

export class ListFavoritesUseCase {
  constructor(
    private readonly indicators: IndicatorRepository,
    private readonly favorites: FavoriteRepository,
  ) {}

  async execute(clientId: string) {
    const favoriteRows = await this.favorites.findByClientId(clientId);
    const allIndicators = await this.indicators.findAll();
    const indicatorMap = new Map(allIndicators.map((item) => [item.id, item]));

    return favoriteRows
      .map((favorite) => {
        const indicator = indicatorMap.get(favorite.indicatorId);
        if (!indicator) return null;
        return {
          id: favorite.id,
          indicatorId: indicator.id,
          code: indicator.code,
          name: indicator.name,
          source: indicator.source,
          periodicity: indicator.periodicity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }
}
