import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, createPool, runMigrations } from './db.js';
import { DrizzleObservationRepository } from './repositories.js';
import { indicators, observations } from './schema.js';

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://pulsefx:pulsefx@localhost:5432/pulsefx_test';

describe('DrizzleObservationRepository', () => {
  const pool = createPool(databaseUrl);
  const db = createDb(pool);
  const repository = new DrizzleObservationRepository(db);
  let indicatorId = '';

  beforeAll(async () => {
    await runMigrations(databaseUrl);
    await db.execute(sql`TRUNCATE TABLE favorites, observations, sync_runs, indicators RESTART IDENTITY CASCADE`);

    const [indicator] = await db
      .insert(indicators)
      .values({
        code: 'TEST_USD_BRL',
        source: 'BCB_OLINDA',
        name: 'Test USD/BRL',
        description: 'Test indicator',
        periodicity: 'DAILY',
        variationRule: '5 business days',
        historyWindowDays: 30,
        currencyPair: 'USD',
      })
      .returning();

    indicatorId = indicator!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('upserts observations idempotently', async () => {
    const payload = [
      { referenceDate: new Date('2026-01-10T00:00:00.000Z'), value: 5.1 },
      { referenceDate: new Date('2026-01-11T00:00:00.000Z'), value: 5.2 },
    ];

    await repository.upsertMany(indicatorId, payload);
    await repository.upsertMany(indicatorId, [
      { referenceDate: new Date('2026-01-10T00:00:00.000Z'), value: 5.15 },
      { referenceDate: new Date('2026-01-11T00:00:00.000Z'), value: 5.25 },
    ]);

    const rows = await db.select().from(observations).where(sql`${observations.indicatorId} = ${indicatorId}`);

    expect(rows).toHaveLength(2);
    expect(Number(rows.find((row) => row.referenceDate === '2026-01-10')?.value)).toBe(5.15);
    expect(Number(rows.find((row) => row.referenceDate === '2026-01-11')?.value)).toBe(5.25);
  });
});
