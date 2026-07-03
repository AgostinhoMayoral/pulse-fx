import 'dotenv/config';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { runMigrations } from './db.js';

loadEnv({ path: resolve(process.cwd(), '../../.env') });
loadEnv({ path: resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

runMigrations(databaseUrl)
  .then(() => {
    console.log('Migrations completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
