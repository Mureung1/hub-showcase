import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from 'express';

import type { InsightCaptureResult } from '../src/entities/insight/model/insight_capture.js';
import type { ServerInsightCaptureService } from './insight_capture_service.js';
import type {
  InsightMemoResult,
  ServerInsightMemoService,
} from './insight_memo_service.js';

export type CreateAppOptions = {
  captureService?: ServerInsightCaptureService;
  logger?: Pick<Console, 'error'>;
  memoService?: ServerInsightMemoService;
};

const captureJsonParser = express.json({ limit: '8kb' });
const ANDROID_WEBVIEW_ORIGINS = new Set([
  'https://localhost',
  'http://localhost',
]);
const CORS_ALLOWED_HEADERS = 'Authorization, Content-Type';
const CORS_ALLOWED_METHODS = 'GET, POST, PATCH, OPTIONS';

const allowAndroidWebViewCors: RequestHandler = (request, response, next) => {
  response.vary('Origin');

  const origin = request.header('origin');
  if (!origin || !ANDROID_WEBVIEW_ORIGINS.has(origin)) {
    next();
    return;
  }

  response.set({
    'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS,
    'Access-Control-Allow-Origin': origin,
  });

  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }

  next();
};

const parseCaptureJson: RequestHandler = (request, response, next) => {
  captureJsonParser(request, response, (error) => {
    if (error) {
      response.status(400).json({ ok: false, reason: 'invalid-request' });
      return;
    }

    next();
  });
};

export function createApp({
  captureService,
  logger = console,
  memoService,
}: CreateAppOptions = {}) {
  const app = express();

  app.use('/api', allowAndroidWebViewCors);

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true });
  });

  app.post(
    '/api/insights/capture',
    parseCaptureJson,
    async (request, response) => {
      const accessToken = getBearerToken(request.header('authorization'));

      if (!accessToken) {
        response.status(401).json({ ok: false, reason: 'permission-denied' });
        return;
      }

      if (!captureService) {
        response.status(503).json({ ok: false, reason: 'write-failed' });
        return;
      }

      const result = await captureService.capture(accessToken, request.body);

      response.status(getCaptureStatus(result)).json(result);
    }
  );

  app.patch(
    '/api/insights/:insightId/memo',
    parseCaptureJson,
    async (request, response) => {
      const accessToken = getBearerToken(request.header('authorization'));

      if (!accessToken) {
        response.status(401).json({ ok: false, reason: 'permission-denied' });
        return;
      }

      if (!memoService) {
        response.status(503).json({ ok: false, reason: 'write-failed' });
        return;
      }

      const result = await memoService.update(
        accessToken,
        getRouteParameter(request.params.insightId),
        request.body
      );

      response.status(getMemoStatus(result)).json(result);
    }
  );

  app.use(createCaptureErrorHandler(logger));

  return app;
}

function createCaptureErrorHandler(
  logger: Pick<Console, 'error'>
): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    try {
      logger.error('요청 처리 중 예외 발생', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        method: request.method,
        path: request.path,
      });
    } catch {
      // 로거 장애가 안전한 오류 응답을 다시 깨뜨리지 않도록 격리한다.
    }
    response.status(503).json({ ok: false, reason: 'write-failed' });
  };
}

function getBearerToken(authorization: string | undefined) {
  const match = /^Bearer ([^\s]+)$/i.exec(authorization ?? '');

  return match?.[1];
}

function getRouteParameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function getCaptureStatus(result: InsightCaptureResult) {
  if (result.ok) {
    return 200;
  }

  if (result.reason === 'permission-denied') {
    return 401;
  }

  if (
    result.reason === 'invalid-request' ||
    result.reason === 'invalid-url' ||
    result.reason === 'unsupported-protocol'
  ) {
    return 400;
  }

  return 503;
}

function getMemoStatus(result: InsightMemoResult) {
  if (result.ok) {
    return 200;
  }

  if (result.reason === 'permission-denied') {
    return 401;
  }

  if (result.reason === 'invalid-request') {
    return 400;
  }

  if (result.reason === 'not-found') {
    return 404;
  }

  return 503;
}
