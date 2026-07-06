import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import nock from 'nock';
import { sql } from 'drizzle-orm';
import { buildApp } from '../../infrastructure/app.js';
import { createDb, createPool, runMigrations } from '../../infrastructure/persistence/db.js';
import { indicators } from '../../infrastructure/persistence/schema.js';
import {
  buildRecentOlindaMockRows,
  EXPECTED_LATEST_MOCK_VALUE,
} from '../../test/fixtures/market-data.js';

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://pulsefx:pulsefx@localhost:5432/pulsefx_test';

describe('SyncIndicators integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>['app'];
  let indicatorId = '';

  beforeAll(async () => {
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');

    await runMigrations(databaseUrl);
    const pool = createPool(databaseUrl);
    const db = createDb(pool);
    await db.execute(sql`TRUNCATE TABLE favorites, observations, sync_runs, indicators RESTART IDENTITY CASCADE`);

    const [indicator] = await db
      .insert(indicators)
      .values({
        code: 'INTEGRATION_USD_BRL',
        source: 'BCB_OLINDA',
        name: 'Integration USD/BRL',
        description: 'Integration test indicator',
        periodicity: 'DAILY',
        variationRule: '5 business days',
        historyWindowDays: 30,
        currencyPair: 'USD',
      })
      .returning();

    indicatorId = indicator!.id;
    await pool.end();

    nock('https://olinda.bcb.gov.br')
      .persist()
      .get(/CotacaoMoedaPeriodo/)
      .reply(200, {
        value: buildRecentOlindaMockRows(),
      });

    const built = await buildApp({ forceSync: true });
    app = built.app;
  });

  afterAll(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    await app.close();
  });

  it('syncs mocked data idempotently and exposes it via GET /indicators', async () => {
    const syncResponse = await app.inject({
      method: 'POST',
      url: '/admin/sync',
      headers: {
        authorization: `Bearer ${process.env.ADMIN_TOKEN}`,
      },
    });

    expect(syncResponse.statusCode).toBe(200);

    const firstList = await app.inject({ method: 'GET', url: '/indicators' });
    const firstBody = firstList.json() as Array<{
      code: string;
      latestValue: number | null;
      percentChange: number | null;
    }>;
    const firstIndicator = firstBody.find((item) => item.code === 'INTEGRATION_USD_BRL');

    expect(firstIndicator?.latestValue).toBe(EXPECTED_LATEST_MOCK_VALUE);
    expect(firstIndicator?.percentChange).not.toBeNull();

    const secondSync = await app.inject({
      method: 'POST',
      url: '/admin/sync',
      headers: {
        authorization: `Bearer ${process.env.ADMIN_TOKEN}`,
      },
    });

    expect(secondSync.statusCode).toBe(200);

    const secondList = await app.inject({ method: 'GET', url: '/indicators' });
    const secondBody = secondList.json() as Array<{ code: string; latestValue: number | null }>;
    const secondIndicator = secondBody.find((item) => item.code === 'INTEGRATION_USD_BRL');

    expect(secondIndicator?.latestValue).toBe(EXPECTED_LATEST_MOCK_VALUE);
    expect(indicatorId).toBeTruthy();
  });
});
