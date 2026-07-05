import './config/load-env.js';
import cron from 'node-cron';
import { buildApp } from './infrastructure/app.js';

export { buildApp } from './infrastructure/app.js';

export async function startServer() {
  const { app, config, syncIndicators } = await buildApp();

  cron.schedule('0 */6 * * *', () => {
    app.log.info('Starting scheduled sync');
    syncIndicators.execute().catch((error) => {
      app.log.error({ err: error }, 'Scheduled sync failed');
    });
  });

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  app.log.info(`Pulse FX API listening on port ${config.PORT}`);

  return app;
}

const isDirectRun = process.argv[1]?.endsWith('main.ts') || process.argv[1]?.endsWith('main.js');

if (isDirectRun) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
