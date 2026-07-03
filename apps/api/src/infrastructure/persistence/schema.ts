import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  numeric,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const sourceEnum = pgEnum('source', ['BCB_OLINDA', 'BCB_SGS', 'FRED']);
export const periodicityEnum = pgEnum('periodicity', ['DAILY', 'MONTHLY']);
export const syncStatusEnum = pgEnum('sync_status', ['running', 'completed', 'failed', 'partial']);

export const indicators = pgTable('indicators', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  source: sourceEnum('source').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  periodicity: periodicityEnum('periodicity').notNull(),
  variationRule: text('variation_rule').notNull(),
  historyWindowDays: integer('history_window_days').notNull(),
  externalSeriesId: text('external_series_id'),
  currencyPair: text('currency_pair'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const observations = pgTable(
  'observations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    indicatorId: uuid('indicator_id')
      .notNull()
      .references(() => indicators.id, { onDelete: 'cascade' }),
    referenceDate: date('reference_date').notNull(),
    value: numeric('value', { precision: 18, scale: 6 }).notNull(),
  },
  (table) => [
    uniqueIndex('observations_indicator_date_unique').on(table.indicatorId, table.referenceDate),
  ],
);

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: text('client_id').notNull(),
    indicatorId: uuid('indicator_id')
      .notNull()
      .references(() => indicators.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('favorites_client_indicator_unique').on(table.clientId, table.indicatorId),
  ],
);

export const syncRuns = pgTable('sync_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: syncStatusEnum('status').notNull().default('running'),
  recordsUpserted: integer('records_upserted').notNull().default(0),
  errorMessage: text('error_message'),
});

export const indicatorsRelations = relations(indicators, ({ many }) => ({
  observations: many(observations),
  favorites: many(favorites),
}));

export const observationsRelations = relations(observations, ({ one }) => ({
  indicator: one(indicators, {
    fields: [observations.indicatorId],
    references: [indicators.id],
  }),
}));

export type IndicatorRow = typeof indicators.$inferSelect;
export type ObservationRow = typeof observations.$inferSelect;
export type FavoriteRow = typeof favorites.$inferSelect;
export type SyncRunRow = typeof syncRuns.$inferSelect;
