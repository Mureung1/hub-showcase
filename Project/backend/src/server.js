const app = require('./app');
const env = require('./config/env');
const { assertDbConnection } = require('./config/db');
require('./models');
const { startDeadlineScheduler } = require('./schedulers/deadlineScheduler');

async function bootstrap() {
  await assertDbConnection();
  startDeadlineScheduler();

  app.listen(env.port, () => {
    console.log(`[server] listening on port ${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});

