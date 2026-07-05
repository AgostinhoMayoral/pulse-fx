import '../../config/load-env.js';
import { eq } from 'drizzle-orm';
import { createDb, createPool } from './db.js';
import { indicators } from './schema.js';
import { VARIATION_RULES } from '../../domain/calculate-variation.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const seedIndicators = [
  {
    code: 'USD_BRL_PTAX',
    source: 'BCB_OLINDA' as const,
    name: 'USD/BRL PTAX (Venda)',
    description:
      'Official BCB PTAX selling rate for USD against BRL. Core FX benchmark for Brazilian market participants.',
    periodicity: 'DAILY' as const,
    variationRule: VARIATION_RULES.DAILY,
    historyWindowDays: 90,
    currencyPair: 'USD',
    externalSeriesId: null,
  },
  {
    code: 'EUR_BRL_PTAX',
    source: 'BCB_OLINDA' as const,
    name: 'EUR/BRL PTAX (Venda)',
    description:
      'Official BCB PTAX selling rate for EUR against BRL. Useful to monitor EUR exposure alongside USD/BRL.',
    periodicity: 'DAILY' as const,
    variationRule: VARIATION_RULES.DAILY,
    historyWindowDays: 90,
    currencyPair: 'EUR',
    externalSeriesId: null,
  },
  {
    code: 'SELIC_META',
    source: 'BCB_SGS' as const,
    name: 'Selic Target Rate',
    description:
      'Brazilian benchmark interest rate target published by BCB. Key macro signal for local fixed income and FX context.',
    periodicity: 'MONTHLY' as const,
    variationRule: VARIATION_RULES.MONTHLY,
    historyWindowDays: 730,
    currencyPair: null,
    externalSeriesId: '1178',
  },
  {
    code: 'IPCA',
    source: 'BCB_SGS' as const,
    name: 'IPCA (Inflation)',
    description:
      'Official Brazilian inflation index. Helps users compare price pressure at home against external benchmarks.',
    periodicity: 'MONTHLY' as const,
    variationRule: VARIATION_RULES.MONTHLY,
    historyWindowDays: 730,
    currencyPair: null,
    externalSeriesId: '433',
  },
  {
    code: 'FEDFUNDS',
    source: 'FRED' as const,
    name: 'Effective Federal Funds Rate',
    description:
      'US effective policy rate from FRED. Provides international monetary context when reading BRL FX moves.',
    periodicity: 'MONTHLY' as const,
    variationRule: VARIATION_RULES.MONTHLY,
    historyWindowDays: 730,
    currencyPair: null,
    externalSeriesId: 'FEDFUNDS',
  },
  {
    code: 'CPI_US',
    source: 'FRED' as const,
    name: 'US CPI (All Urban Consumers)',
    description:
      'US inflation benchmark from FRED. Supports macro comparison between Brazil and the United States.',
    periodicity: 'MONTHLY' as const,
    variationRule: VARIATION_RULES.MONTHLY,
    historyWindowDays: 730,
    currencyPair: null,
    externalSeriesId: 'CPIAUCSL',
  },
];

async function seed() {
  const pool = createPool(databaseUrl!);
  const db = createDb(pool);

  try {
    for (const item of seedIndicators) {
      await db
        .insert(indicators)
        .values(item)
        .onConflictDoUpdate({
          target: indicators.code,
          set: {
            name: item.name,
            description: item.description,
            variationRule: item.variationRule,
            historyWindowDays: item.historyWindowDays,
            externalSeriesId: item.externalSeriesId,
            currencyPair: item.currencyPair,
          },
        });
    }

    console.log(`Seeded ${seedIndicators.length} indicators`);
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
