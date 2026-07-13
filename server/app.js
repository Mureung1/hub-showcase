import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

import config from './src/config/index.js';
import healthRoutes from './src/routes/healthRoutes.js';
import { notFound, errorHandler } from './src/middlewares/errorHandler.js';
import { createLogger } from './src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createLogger('app');

// API 명세(docs/openapi.yaml)를 Swagger UI로 서빙 — 명세가 단일 진실 소스
// 서버 단독 배포 등으로 파일이 없으면 부팅 실패 대신 /api-docs만 비활성화한다
function loadOpenapiDocument() {
    const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
    if (!fs.existsSync(openapiPath)) {
        logger.warn('openapi.yaml을 찾을 수 없어 /api-docs를 비활성화합니다.', { openapiPath });
        return null;
    }
    return YAML.parse(fs.readFileSync(openapiPath, 'utf8'));
}

const openapiDocument = loadOpenapiDocument();

const app = express();

// CSP는 Swagger UI 정적 자원과 충돌하므로 비활성화 (JSON API 서버라 영향 최소)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/health', healthRoutes);
if (openapiDocument) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
}

app.use(notFound);
app.use(errorHandler);

export default app;
