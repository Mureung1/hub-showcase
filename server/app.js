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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// API 명세(docs/openapi.yaml)를 Swagger UI로 서빙 — 명세가 단일 진실 소스
const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
const openapiDocument = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));

const app = express();

// CSP는 Swagger UI 정적 자원과 충돌하므로 비활성화 (JSON API 서버라 영향 최소)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.use(notFound);
app.use(errorHandler);

export default app;
