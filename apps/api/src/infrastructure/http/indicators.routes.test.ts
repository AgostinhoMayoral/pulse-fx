import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../infrastructure/app.js';
import { createDb, createPool, runMigrations } from '../persistence/db.js';
import { indicators, observations } from '../persistence/schema.js';
import { sql } from 'drizzle-orm';
import {
  buildRecentBusinessDaySeries,
  EXPECTED_LATEST_MOCK_VALUE,
} from '../../test/fixtures/market-data.js';

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://pulsefx:pulsefx@localhost:5432/pulsefx_test';

describe('Indicators routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>['app'];
  let indicatorId = '';

  beforeAll(async () => {
    await runMigrations(databaseUrl);
    const pool = createPool(databaseUrl);
    const db = createDb(pool);
    await db.execute(sql`TRUNCATE TABLE favorites, observations, sync_runs, indicators RESTART IDENTITY CASCADE`);

    const [indicator] = await db
      .insert(indicators)
      .values({
        code: 'ROUTE_USD_BRL',
        source: 'BCB_OLINDA',
        name: 'Route USD/BRL',
        description: 'Route test indicator',
        periodicity: 'DAILY',
        variationRule: '5 business days',
        historyWindowDays: 30,
        currencyPair: 'USD',
      })
      .returning();

    indicatorId = indicator!.id;

    await db.insert(observations).values(
      buildRecentBusinessDaySeries().map((item) => ({
        indicatorId,
        referenceDate: item.referenceDate,
        value: item.value,
      })),
    );

    await pool.end();

    const built = await buildApp();
    app = built.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns dashboard indicators with persisted latest value', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/indicators',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Array<{ code: string; latestValue: number | null }>;
    const indicator = body.find((item) => item.code === 'ROUTE_USD_BRL');
    expect(indicator?.latestValue).toBe(EXPECTED_LATEST_MOCK_VALUE);
  });

  it('rejects admin sync without token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/admin/sync',
    });

    expect(response.statusCode).toBe(401);
  });

  it('requires client id when creating favorite', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/favorites',
      payload: { indicatorId },
    });

    expect(response.statusCode).toBe(400);
  });

  it('adds and removes favorites with browser-like delete headers', async () => {
    const clientId = 'route-test-client';

    const addResponse = await app.inject({
      method: 'POST',
      url: '/favorites',
      headers: {
        'x-client-id': clientId,
        'content-type': 'application/json',
      },
      payload: { indicatorId },
    });
    expect(addResponse.statusCode).toBe(200);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/favorites/${indicatorId}`,
      headers: {
        'x-client-id': clientId,
        'content-type': 'application/json',
      },
    });
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.json()).toEqual({ success: true });
  });
});
