import 'dotenv/config';

import app from './app.js';
import config from './src/config/index.js';
import prisma from './src/config/prisma.js';
import { createLogger } from './src/utils/logger.js';

const logger = createLogger('server');

// DB 연결 확인 — 실패해도 서버는 띄운다 (DB 없이도 /health, /api-docs는 동작해야 함)
try {
    await prisma.$connect();
    logger.info('Prisma(Supabase PostgreSQL) 연결 성공');
} catch (error) {
    logger.error('Prisma 연결 실패 — DATABASE_URL 설정을 확인하세요:', { error: error.message });
}

app.listen(config.port, () => {
    logger.info(`서버 시작: http://localhost:${config.port}`);
});
