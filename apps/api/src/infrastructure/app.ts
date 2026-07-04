import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { loadConfig } from '../config/env.js';
import { createDb, createPool } from './persistence/db.js';
import {
  DrizzleFavoriteRepository,
  DrizzleIndicatorRepository,
  DrizzleObservationRepository,
  DrizzleSyncRunRepository,
} from './persistence/repositories.js';
import { BcbOlindaClient } from './external/bcb-olinda.client.js';
import { BcbSgsClient } from './external/bcb-sgs.client.js';
import { FredClient } from './external/fred.client.js';
import {
  GetIndicatorDetailUseCase,
  ListFavoritesUseCase,
  ListIndicatorsUseCase,
  ToggleFavoriteUseCase,
} from '../application/use-cases/indicator.use-cases.js';
import { SyncIndicatorsUseCase } from '../application/use-cases/sync-indicators.use-case.js';
import { registerRoutes } from './http/routes.js';

export async function buildApp(options?: { forceSync?: boolean }) {
  const config = loadConfig();
  const pool = createPool(config.DATABASE_URL);
  const db = createDb(pool);

  const indicators = new DrizzleIndicatorRepository(db);
  const observations = new DrizzleObservationRepository(db);
  const favorites = new DrizzleFavoriteRepository(db);
  const syncRuns = new DrizzleSyncRunRepository(db);

  const bcbOlinda = new BcbOlindaClient();
  const bcbSgs = new BcbSgsClient();
  const fred = new FredClient(config.FRED_API_KEY);

  const syncIndicators = new SyncIndicatorsUseCase({
    indicators,
    observations,
    syncRuns,
    bcbOlinda,
    bcbSgs,
    fred,
    ttlDailyHours: config.SYNC_TTL_DAILY_HOURS,
    ttlMonthlyHours: config.SYNC_TTL_MONTHLY_HOURS,
    force: options?.forceSync,
  });

  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.NODE_ENV === 'production' ? 'info' : 'debug',
            redact: ['req.headers.authorization'],
          },
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Client-Id', 'Authorization'],
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  await registerRoutes(app, {
    listIndicators: new ListIndicatorsUseCase(indicators, observations, favorites),
    getIndicatorDetail: new GetIndicatorDetailUseCase(indicators, observations, favorites),
    listFavorites: new ListFavoritesUseCase(indicators, favorites),
    toggleFavorite: new ToggleFavoriteUseCase(indicators, favorites),
    syncIndicators,
    adminToken: config.ADMIN_TOKEN,
    db,
  });

  app.addHook('onClose', async () => {
    await pool.end();
  });

  return { app, config, syncIndicators };
}

export type BuiltApp = {
  app: FastifyInstance;
  config: ReturnType<typeof loadConfig>;
  syncIndicators: SyncIndicatorsUseCase;
};
