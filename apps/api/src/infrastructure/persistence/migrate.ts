import '../../config/load-env.js';
import { runMigrations } from './db.js';

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
