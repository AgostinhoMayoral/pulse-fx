import { eq, and, desc, gte, sql } from 'drizzle-orm';
import type {
  FavoriteRepository,
  IndicatorEntity,
  IndicatorRepository,
  ObservationEntity,
  ObservationRepository,
  SyncRunRepository,
} from '../../application/ports/repositories.js';
import type { Database } from './db.js';
import { favorites, indicators, observations, syncRuns } from './schema.js';

function mapIndicator(row: typeof indicators.$inferSelect): IndicatorEntity {
  return {
    id: row.id,
    code: row.code,
    source: row.source,
    name: row.name,
    description: row.description,
    periodicity: row.periodicity,
    variationRule: row.variationRule,
    historyWindowDays: row.historyWindowDays,
    externalSeriesId: row.externalSeriesId,
    currencyPair: row.currencyPair,
    lastSyncedAt: row.lastSyncedAt,
  };
}

function mapObservation(row: typeof observations.$inferSelect): ObservationEntity {
  return {
    id: row.id,
    indicatorId: row.indicatorId,
    referenceDate: new Date(`${row.referenceDate}T00:00:00.000Z`),
    value: Number(row.value),
  };
}

export class DrizzleIndicatorRepository implements IndicatorRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<IndicatorEntity[]> {
    const rows = await this.db.select().from(indicators).orderBy(indicators.name);
    return rows.map(mapIndicator);
  }

  async findByCode(code: string): Promise<IndicatorEntity | null> {
    const [row] = await this.db.select().from(indicators).where(eq(indicators.code, code)).limit(1);
    return row ? mapIndicator(row) : null;
  }

  async findById(id: string): Promise<IndicatorEntity | null> {
    const [row] = await this.db.select().from(indicators).where(eq(indicators.id, id)).limit(1);
    return row ? mapIndicator(row) : null;
  }

  async updateLastSyncedAt(id: string, syncedAt: Date): Promise<void> {
    await this.db.update(indicators).set({ lastSyncedAt: syncedAt }).where(eq(indicators.id, id));
  }
}

export class DrizzleObservationRepository implements ObservationRepository {
  constructor(private readonly db: Database) {}

  async upsertMany(
    indicatorId: string,
    items: Array<{ referenceDate: Date; value: number }>,
  ): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    const values = items.map((item) => ({
      indicatorId,
      referenceDate: item.referenceDate.toISOString().slice(0, 10),
      value: item.value.toString(),
    }));

    await this.db
      .insert(observations)
      .values(values)
      .onConflictDoUpdate({
        target: [observations.indicatorId, observations.referenceDate],
        set: {
          value: sql`excluded.value`,
        },
      });

    return items.length;
  }

  async findByIndicatorId(
    indicatorId: string,
    options?: { fromDate?: Date; limit?: number },
  ): Promise<ObservationEntity[]> {
    const conditions = [eq(observations.indicatorId, indicatorId)];

    if (options?.fromDate) {
      conditions.push(gte(observations.referenceDate, options.fromDate.toISOString().slice(0, 10)));
    }

    let query = this.db
      .select()
      .from(observations)
      .where(and(...conditions))
      .orderBy(desc(observations.referenceDate));

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    const rows = await query;
    return rows.map(mapObservation).reverse();
  }

  async findLatest(indicatorId: string): Promise<ObservationEntity | null> {
    const [row] = await this.db
      .select()
      .from(observations)
      .where(eq(observations.indicatorId, indicatorId))
      .orderBy(desc(observations.referenceDate))
      .limit(1);

    return row ? mapObservation(row) : null;
  }
}

export class DrizzleFavoriteRepository implements FavoriteRepository {
  constructor(private readonly db: Database) {}

  async findByClientId(clientId: string) {
    const rows = await this.db
      .select({
        id: favorites.id,
        clientId: favorites.clientId,
        indicatorId: favorites.indicatorId,
      })
      .from(favorites)
      .where(eq(favorites.clientId, clientId));

    return rows;
  }

  async add(clientId: string, indicatorId: string) {
    const [row] = await this.db
      .insert(favorites)
      .values({ clientId, indicatorId })
      .onConflictDoNothing()
      .returning();

    if (row) {
      return row;
    }

    const [existing] = await this.db
      .select()
      .from(favorites)
      .where(and(eq(favorites.clientId, clientId), eq(favorites.indicatorId, indicatorId)))
      .limit(1);

    return existing!;
  }

  async remove(clientId: string, indicatorId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(favorites)
      .where(and(eq(favorites.clientId, clientId), eq(favorites.indicatorId, indicatorId)))
      .returning();

    return deleted.length > 0;
  }

  async isFavorite(clientId: string, indicatorId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.clientId, clientId), eq(favorites.indicatorId, indicatorId)))
      .limit(1);

    return Boolean(row);
  }
}

export class DrizzleSyncRunRepository implements SyncRunRepository {
  constructor(private readonly db: Database) {}

  async start(source: string): Promise<string> {
    const [row] = await this.db.insert(syncRuns).values({ source }).returning({ id: syncRuns.id });
    return row!.id;
  }

  async finish(
    id: string,
    payload: {
      status: 'completed' | 'failed' | 'partial';
      recordsUpserted: number;
      errorMessage?: string;
    },
  ): Promise<void> {
    await this.db
      .update(syncRuns)
      .set({
        status: payload.status,
        recordsUpserted: payload.recordsUpserted,
        errorMessage: payload.errorMessage,
        finishedAt: new Date(),
      })
      .where(eq(syncRuns.id, id));
  }
}
