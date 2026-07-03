import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

export function createPool(connectionString: string): pg.Pool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export function createDb(pool: pg.Pool) {
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDb>;

function getMigrationsFolder(): string {
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), '../../../drizzle'),
    join(process.cwd(), 'drizzle'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Migrations folder not found');
}

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = createPool(connectionString);
  const db = createDb(pool);

  try {
    await migrate(db, { migrationsFolder: getMigrationsFolder() });
  } finally {
    await pool.end();
  }
}
