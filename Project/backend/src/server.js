const app = require('./app');
const env = require('./config/env');
const { assertDbConnection } = require('./config/db');
require('./models');

async function bootstrap() {
  await assertDbConnection();

  app.listen(env.port, () => {
    console.log(`[server] listening on port ${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});

