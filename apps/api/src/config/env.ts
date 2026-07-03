import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  FRED_API_KEY: z.string().min(1),
  ADMIN_TOKEN: z.string().min(8),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SYNC_TTL_DAILY_HOURS: z.coerce.number().default(6),
  SYNC_TTL_MONTHLY_HOURS: z.coerce.number().default(24),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${details.join('\n')}`);
  }

  return parsed.data;
}
