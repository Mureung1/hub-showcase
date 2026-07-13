import 'dotenv/config';

import app from './app.js';
import config from './src/config/index.js';
import { createLogger } from './src/utils/logger.js';

const logger = createLogger('server');

app.listen(config.port, () => {
    logger.info(`서버 시작: http://localhost:${config.port}`);
});
