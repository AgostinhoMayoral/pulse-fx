import { beforeAll, afterAll } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://pulsefx:pulsefx@localhost:5432/pulsefx_test';
process.env.FRED_API_KEY = process.env.FRED_API_KEY ?? 'test-fred-key';
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'test-admin-token-secure';
process.env.CORS_ORIGIN = 'http://localhost:5173';

beforeAll(async () => {
  // Migrations are run per test file when needed.
});

afterAll(async () => {
  // Pools are closed by app lifecycle in each test file.
});
